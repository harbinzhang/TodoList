---
description: Flexible hosted-staging validation workflow for core user journeys with read-only, read-write, and deep-verification modes
---

# Staging User Journey Verification

Use this workflow when you need more flexibility than the default `staging-qa` gate and want to verify core user journeys on hosted staging with either read-only smoke or controlled staging writes.

This workflow is the general staging journey harness. It reuses the existing staging test lanes instead of inventing a parallel suite.

## Modes

Pick the lightest mode that can answer the request.

### 1. Read-only smoke

Use when the user wants confirmation that the hosted staging app is reachable and core pages still work without intentionally mutating staging data.

Run:

```bash
npm run test:e2e:staging:readonly
```

This runs the `@prod` remote staging smoke only and avoids intentional staging writes.

### 2. Default gate

Use after a staging deploy or when the user wants the normal fast post-deploy confidence check.

Run:

```bash
npm run staging:qa
```

This adds Firebase Auth, Firestore baseline, stale test-data cleanup, and hosting build metadata checks on top of the remote browser coverage.

### 3. Read-write journey verification

Use when the changed behavior cannot be proven by read-only checks alone, for example:

- settings persistence
- add/remove card flows
- tracker used or undo persistence
- Firestore-triggered records after a staging-safe UI action
- cleanup or repair of clearly marked temporary staging records

Run the existing staging E2E lane first:

```bash
npm run test:e2e:staging:write
```

This isolates the `@release` write regression lane. Then perform any additional targeted Firestore verification or temporary writes from `functions/` with ADC credentials available.

### 4. Tracker deep verification

Use `.agents/workflows/staging-tracker-verification.md` instead of this generic workflow when the request is primarily about:

- cadence or period logic
- `userCards` to `userCardBenefitsTracking` derivation
- deterministic tracking doc IDs
- used/unused persistence at the document-shape level
- trigger-generated tracker rows

## Prerequisites

- Staging is deployed and reachable at `https://perkmon-staging.web.app`
- `.env.staging` exists and points at `perkly-staging-7dab8`
- `.env.staging.local` or the shell environment provides `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`
- Application Default Credentials are available for Firebase Admin SDK access
- `functions/node_modules` is installed when Firestore or Auth checks are required

## Core Journey Matrix

Use this matrix to decide what must be exercised.

| Journey | Read-only evidence | Write-backed evidence |
|---|---|---|
| Access/Auth | login page renders, protected routes redirect, authenticated dashboard loads | repair or verify staging test user only if login is blocked |
| Dashboard | dashboard heading renders, no 5xx or uncaught runtime errors | usually no extra write needed |
| Wallet/Cards | cards pages load, card detail resolves, card search returns results | add a shared card, confirm `userCards` row exists, then remove and verify cleanup |
| Tracker | tracker page loads and seeded data renders | mark a benefit used, verify persistence, undo or restore baseline |
| Settings | settings page renders without runtime errors | update profile preferences, verify persisted values, then restore originals |

When the user asks to verify "core user journeys", cover at least:

1. authenticated app access
2. dashboard
3. wallet/cards
4. tracker
5. settings or another directly changed surface

## Firestore Interaction Rules

- Default to read-only inspection first.
- Any write must have a verification reason and an explicit cleanup step.
- Use distinctive markers such as `codex-staging-journey-<suffix>` for temporary records.
- Restrict temporary writes to the staging E2E user unless the user explicitly requests broader staging manipulation.
- If you create a temporary `userCard`, delete its derived tracking docs and then delete the `userCard`.
- If you update existing user settings, restore the original values before finishing.
- If cleanup fails, report the exact remaining records and stop claiming the environment is restored.

## Firestore Execution Pattern

For quick reads or tightly scoped write/readback checks, run inline scripts from `functions/`:

```bash
cd functions && npx tsx -e "
import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'perkly-staging-7dab8' });
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
// inspect or update staging docs here
"
```

For broader changes or repeatable repairs, follow `.agents/workflows/run-firestore-script.md` and create a script in `exp/functions-scripts/`.

## Recommended Execution Order

1. Start with `npm run test:e2e:staging:readonly` unless the request needs write-backed proof.
2. If the user wants default deploy confidence, run `npm run staging:qa`.
3. If a targeted journey still needs stronger proof, run `npm run test:e2e:staging:write` and then perform the smallest staging-safe write/readback check that closes the gap.
4. Clean up all temporary staging records.
5. Re-check the affected journey or data baseline when cleanup matters to confidence.

## Failure Handling

- If remote E2E fails, classify the failure as app behavior, staging data drift, credentials, or environment instability before rerunning.
- If the staging E2E user is missing or invalid, repair only the staging user and report that intervention.
- If seeded staging data is insufficient for a journey, either create a temporary marked record and clean it up, or report the missing prerequisite explicitly.
- If cleanup cannot fully restore baseline, list the leftover document IDs and collection names.

## Report Format

Report:

- mode selected and why
- commands run
- journeys exercised and result
- Firestore reads and writes performed
- temporary records created and cleanup status
- skips, blockers, and residual risk
