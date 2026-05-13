---
description: How to verify the staging tracker and tracking-creation flow end to end
---

# Staging Tracker Verification

Use this workflow to validate the tracker flow in staging after tracker or tracking-generation changes.

For the default fast post-deploy staging gate, run `.agents/workflows/staging-qa.md` instead.

This workflow combines:
- remote staging Playwright coverage
- direct staging Firestore inspection
- a targeted manual write/readback check for trigger-created tracking docs

## Prerequisites

- Staging is already deployed and reachable at `https://perkmon-staging.web.app`
- `.env.staging` exists and contains the staging E2E credentials
- Application Default Credentials are available for Firebase Admin SDK access
- The operator understands that temporary staging records may be created and must be removed

## Step 1: Run Existing Staging E2E

From the repo root:

```bash
set -a && source .env.staging && set +a && npm run test:e2e:staging
```

Expected coverage:
- login/setup
- settings persistence
- add-card staging write regression
- tracker used persistence after reload
- tracker undo
- combined tracker persistence
- dashboard/card smoke

## Step 2: Repair the Staging E2E User if Login Fails

If the suite fails during global setup with `auth/invalid-credential`, verify the staging Auth user exists:

```bash
cd functions && npx tsx -e "
import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'perkly-staging-7dab8' });
const user = await admin.auth().getUserByEmail(process.env.E2E_TEST_EMAIL!);
console.log(JSON.stringify({ uid: user.uid, email: user.email, disabled: user.disabled }, null, 2));
"
```

If the user exists, reset its password to match `.env.staging` and rerun staging E2E:

```bash
set -a && source .env.staging && set +a && \
cd functions && npx tsx -e "
import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'perkly-staging-7dab8' });
const email = process.env.E2E_TEST_EMAIL!;
const password = process.env.E2E_TEST_PASSWORD!;
const user = await admin.auth().getUserByEmail(email);
await admin.auth().updateUser(user.uid, { password });
console.log(JSON.stringify({ uid: user.uid, email }, null, 2));
"
```

Only do this in staging.

## Step 3: Inspect the Staging Test User Baseline

Read the staging test user profile and current wallet/tracking counts before creating any temporary records:

```bash
cd functions && npx tsx -e "
import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'perkly-staging-7dab8' });
const db = admin.firestore();
const email = process.env.E2E_TEST_EMAIL!;
const users = await db.collection('users').where('email', '==', email).get();
const user = users.docs[0];
const userId = user.id;
const userCards = await db.collection('userCards').where('userId', '==', userId).get();
const trackings = await db.collection('userCardBenefitsTracking').where('userId', '==', userId).get();
console.log(JSON.stringify({
  userId,
  profile: user.data(),
  userCards: userCards.size,
  trackingDocs: trackings.size,
}, null, 2));
"
```

Prefer a clean baseline. If the test user has leftover temp records from a prior run, remove or account for them before continuing.

## Step 4: Pick a Shared Card with Trackable Benefits

Choose a shared card in staging that has at least one non-`always` cadence benefit.

Useful query pattern:

```bash
cd functions && npx tsx -e "
import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'perkly-staging-7dab8' });
const db = admin.firestore();
const cards = await db.collection('cards').get();
for (const card of cards.docs) {
  const benefits = await db.collection('cardBenefits').where('cardId', '==', card.id).limit(8).get();
  const trackable = benefits.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((benefit) => benefit.cadence && benefit.cadence !== 'always');
  if (trackable.length > 0) {
    console.log(JSON.stringify({
      cardId: card.id,
      displayName: card.data().displayName,
      issuer: card.data().issuer,
      sampleBenefits: trackable.map((benefit) => ({
        id: benefit.id,
        title: benefit.title,
        cadence: benefit.cadence,
        amount: benefit.amount,
        currency: benefit.currency,
      })),
    }, null, 2));
    break;
  }
}
"
```

Pick one card and record:
- `cardId`
- `displayName`
- at least one annual/semi-annual/monthly/once benefit to inspect

## Step 5: Create a Temporary Staging `userCard`

Insert a temporary shared `userCard` for the staging test user.
Use a distinctive nickname such as `codex-staging-tracker-check`.

```bash
cd functions && npx tsx -e "
import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'perkly-staging-7dab8' });
const db = admin.firestore();
const payload = {
  userId: '<USER_ID>',
  cardId: '<CARD_ID>',
  isCustomCard: false,
  nickname: 'codex-staging-tracker-check',
  issuedOn: null,
  createdAt: new Date().toISOString(),
};
const ref = await db.collection('userCards').add(payload);
console.log(JSON.stringify({ userCardId: ref.id, ...payload }, null, 2));
"
```

Record the returned `userCardId`.

## Step 6: Verify Trigger-Created Tracking Docs

Wait a few seconds for `onUserCardCreated` to run, then read back all tracking docs for that `userCardId`:

```bash
sleep 6 && cd functions && npx tsx -e "
import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'perkly-staging-7dab8' });
const db = admin.firestore();
const snap = await db.collection('userCardBenefitsTracking')
  .where('userCardId', '==', '<USER_CARD_ID>')
  .get();
console.log('trackingCount', snap.size);
for (const doc of snap.docs) {
  const data = doc.data();
  console.log(JSON.stringify({
    id: doc.id,
    benefitId: data.benefitId,
    benefitTitle: data.benefitTitle,
    usedDate: data.usedDate ?? null,
    usedAmount: data.usedAmount ?? null,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    autoChecked: data.autoChecked ?? false,
  }, null, 2));
}
"
```

Verify:
- one tracking doc exists per trackable benefit
- `periodStart` / `periodEnd` look correct for the current ET business day
- `once` benefits use `9999-12-31` as the end date
- deterministic doc ids include `userId__benefitId__userCardId__periodStart__periodEnd`
- initial rows are not unexpectedly marked used

## Step 7: Verify Used-State Persistence

Pick one tracking doc and simulate the same write shape the frontend uses when marking a benefit complete:

```bash
cd functions && npx tsx -e "
import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'perkly-staging-7dab8' });
const db = admin.firestore();
const trackingId = '<TRACKING_ID>';
const usedDate = new Date().toISOString();
await db.collection('userCardBenefitsTracking').doc(trackingId).update({
  usedDate,
  usedAmount: <TARGET_AMOUNT_OR_NULL>,
  autoChecked: false,
  redeemedValueUsd: null,
});
const doc = await db.collection('userCardBenefitsTracking').doc(trackingId).get();
console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
"
```

Verify:
- `usedDate` is now populated
- `usedAmount` matches the expected target for amount-tracked benefits
- `periodStart` / `periodEnd` are unchanged
- the write lands on the same deterministic tracking doc

If the user specifically wants a UI-path verification, do the same action through the staging app after the staging E2E login path is healthy, then confirm the corresponding Firestore doc changed.

## Step 8: Clean Up Temporary Staging Data

Delete the temporary tracking docs and `userCard` created during the manual pass:

```bash
cd functions && npx tsx -e "
import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'perkly-staging-7dab8' });
const db = admin.firestore();
const userCardId = '<USER_CARD_ID>';
const trackings = await db.collection('userCardBenefitsTracking')
  .where('userCardId', '==', userCardId)
  .get();
const batch = db.batch();
for (const doc of trackings.docs) batch.delete(doc.ref);
batch.delete(db.collection('userCards').doc(userCardId));
await batch.commit();
const remainingTrackings = await db.collection('userCardBenefitsTracking')
  .where('userCardId', '==', userCardId)
  .get();
const userCard = await db.collection('userCards').doc(userCardId).get();
console.log(JSON.stringify({
  deletedTrackingCount: trackings.size,
  remainingTrackingCount: remainingTrackings.size,
  userCardExists: userCard.exists,
}, null, 2));
"
```

Then re-read the test user baseline to confirm wallet/tracking counts returned to the pre-run state.

## Report Format

Use this structure:

```md
## Staging Tracker Verification

### Automated
- `npm run test:e2e:staging`: pass/fail
- if failed: failure point and whether the staging test user was repaired

### Manual Firestore Verification
- staging test user and baseline counts
- shared card used for verification
- created `userCardId`
- tracking docs created: N
- verified period keys:
  - annual: ...
  - semi-annual/monthly/once: ...
- used-state writeback result: ...

### Cleanup
- temporary staging records removed: yes/no
- final wallet/tracking counts after cleanup

### Risks / Follow-up
- lingering data issues
- skipped staging tests
- anything not validated this round
```

## Notes

- Staging Playwright credentials come from `.env.staging`.
- This workflow is intentionally staging-specific; do not reuse these write steps against production.
- If repeated manual verification becomes common, move the inline Admin SDK commands into a script under `exp/functions-scripts/`.
