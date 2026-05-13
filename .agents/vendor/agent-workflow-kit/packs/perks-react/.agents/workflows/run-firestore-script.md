---
description: How to run one-off scripts against production Firestore data
---

# Running Scripts Against Production Firestore

## Setup

Scripts use `firebase-admin` (server SDK) from `functions/node_modules`.

Canonical location for one-off/admin scripts: `exp/functions-scripts/`.

Do not add one-off/admin scripts under `functions/src/scripts/` because that directory is part of the Cloud Functions runtime lint/build path and can block deploys.

## Script Template

Create `exp/functions-scripts/<name>.ts`:

```typescript
import admin from "./_firebaseAdmin.ts";

admin.initializeApp({ projectId: "perks-react" });
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true }); // prevents errors on undefined fields

async function main() {
  const dryRun = !process.argv.includes("--fix");
  console.log(dryRun ? "🔍 DRY RUN" : "🔧 FIX MODE");

  // Query data
  const snap = await db.collection("cards").get();

  // Process + batch write
  const batch = db.batch();
  for (const doc of snap.docs) {
    // ... analyze, batch.update(doc.ref, { ... })
  }

  if (!dryRun) await batch.commit();
}

main().then(() => process.exit(0)).catch(console.error);
```

## Firestore Collection Reference

All collections are **top-level** (no subcollections). Key collections:

| Collection | Queried by | Description |
|------------|-----------|-------------|
| `users` | `email` | User profiles, stores `starredBenefitKeys`, `hiddenBenefitKeys`, `combinedBenefitKeys` |
| `cards` | — | Shared card catalog |
| `cardBenefits` | `cardId` | Benefits for shared cards (NOT a subcollection of cards) |
| `userCards` | `userId` | User-card associations, stores `autoEnrolledBenefitKeys`, `nickname`, `issuedOn` |
| `userCardBenefitsTracking` | `userId`, `benefitId`, `userCardId` | Benefit tracking records with `periodStart`, `periodEnd`, `usedDate`, `usedAmount` |
| `userCustomCards` | `createdByUserId` | User-created custom cards |
| `userCustomCardBenefits` | `cardId`, `createdByUserId` | Benefits for custom cards |
| `cardUpdateSuggestions` | `submittedByUserId`, `status` | User-submitted card edit suggestions |
| `cardIssueReports` | `status` | User-submitted issue reports |
| `clientErrors` | `userId`, `timestamp` | Client-side error logs |

## Key Rules

1. **Always dry-run first** — default to report-only, require `--fix` flag to write
2. **`ignoreUndefinedProperties: true`** — Firestore rejects `undefined` values; this setting skips them
3. **Batch limit** — Firestore batches max 500 ops. Commit and reset if you exceed ~400
4. **Auth** — Uses Application Default Credentials. If not logged in: `gcloud auth application-default login`

## Running

```bash
# DRY RUN (read-only, safe)
// turbo
cd functions && npx ts-node --project tsconfig.json ../exp/functions-scripts/<name>.ts

# APPLY CHANGES (writes to Firestore)
cd functions && npx ts-node --project tsconfig.json ../exp/functions-scripts/<name>.ts --fix
```

## Existing Scripts

- `exp/functions-scripts/fix-card-art-urls.ts` — Syncs `cardArtUrl` in Firestore `cards` collection to match local JSON files. Builds a displayName→cardArtUrl mapping from `src/data/card-products/cards/` and `non-benefit-cards/`, then updates any mismatched Firestore docs.
- `exp/functions-scripts/inspect-expiration-coverage.ts` — Inspects expiration field coverage across card benefits
- `exp/functions-scripts/rename-expiration-field.ts` — Renames `expiration` to `expirationDays` for benefits collections with dry-run and execute modes
