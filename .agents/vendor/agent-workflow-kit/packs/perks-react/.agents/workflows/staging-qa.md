---
description: Fast post-deploy QA gate for the hosted Firebase staging environment
---

# Staging QA

Use this workflow after `npm run deploy:staging` to confirm the hosted staging app, Firebase Auth, Firestore baseline data, and remote browser smoke coverage are healthy.

This is the default staging gate. It intentionally stays shorter and less invasive than the tracker deep verification workflow.

By default, the Firebase build-marker check validates that staging is serving a readable, recent build. It does not assume the current checkout is the deploy source of truth.

## Prerequisites

- Staging is deployed and reachable at `https://perkmon-staging.web.app`
- `.env.staging` exists and points at `perkly-staging-7dab8`
- `.env.staging.local` or the shell environment provides `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`
- Application Default Credentials are available for Firebase Admin SDK access
- `functions/node_modules` is installed so `firebase-admin` can be loaded

## Run the Gate

From the repo root:

```bash
npm run staging:qa
```

This runs:

1. `npm run test:e2e:staging`
   - authenticated dashboard, cards, tracker, settings, and card detail smoke
   - protected-route redirect smoke without auth
   - staging-safe settings, add-card, and tracker write regressions
   - card art host validation
   - 5xx and uncaught browser error checks for primary pages
2. `npm run staging:qa:firebase`
   - staging project/env guard
   - staging E2E Auth user exists, enabled, and email verified
   - Firestore user, wallet, and tracking baseline readability
   - stale `codex-staging-*` / `staging-qa-*` test record cleanup
   - live `sw-build-meta.js` parse/version/freshness check
   - warn when staging is on a different version than the current checkout
   - fail only when an explicit expected build or version was provided

## Failure Handling

- If remote E2E fails, inspect the Playwright report and rerun only after understanding whether the failure is environment, data, or app behavior.
- If Firebase QA fails, inspect the JSON report path printed by `scripts/staging-qa.mjs`.
- If the Auth user is missing, disabled, or not email verified, repair only the staging E2E user.
- If stale cleanup fails, stop and inspect the affected staging records before rerunning.
- If the build marker version mismatches `package.json`, confirm staging was deployed from the current branch/build.
- If you just deployed and want strict verification that staging picked up that exact web build, run `scripts/staging-qa.mjs` with `--expect-build-id=<buildId>` (or set `STAGING_QA_EXPECT_BUILD_ID` / `STAGING_QA_EXPECT_VERSION`).

## Deep Mode

For comprehensive post-deploy confidence beyond the fast gate, run:

```bash
npm run staging:qa:deep
```

This adds:

1. **Cloud Functions reachability** — POST probe to `logClientError` HTTPS endpoint
2. **Cross-collection consistency** — verify every staging user `userCard` has at least one `userCardBenefitsTracking` doc
3. **Tracking doc shape validation** — sample up to 5 tracking docs, assert required fields present
4. **Client errors spike check** — warn if > 10 `clientErrors` docs in the last hour

Deep mode adds ~10-15 seconds of Firestore queries. Use it when a deploy touches functions, triggers, or data model changes.

## Escalation

Run `staging-tracker-verification` instead of only this fast gate when a change touches:

- benefit cadence or period logic
- `userCards` creation/deletion semantics
- `userCardBenefitsTracking` creation, deterministic IDs, or used-state writes
- Firestore trigger code that derives tracker rows

## Report Format

Report:

- command result for `npm run staging:qa`
- Firebase QA summary counts
- records cleaned by prefix, if any
- whether build-marker validation was health-only or strict expected-build verification
- blockers and residual risk
