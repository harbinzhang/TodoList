---
description: How to deploy the application to Firebase (hosting, functions, rules)
---

# Deploy to Firebase

## Prerequisites

- Firebase CLI installed and authenticated (`firebase login`)
- `.env.production` or `.env.staging` configured with real Firebase credentials
- `VITE_USE_EMULATORS=false` in the selected hosted env file (enforced by `src/safety.ts`)

## Hard-Stop Policy

Do **not** deploy if any pre-deploy check fails or any unusual failure appears. Stop and report blockers first.

Only `/deploy` may run production deploy commands. Do not run any production deploy command unless the user has explicitly acknowledged the production target for that deploy.

Examples of hard-stop blockers:
- E2E failures (including setup failures, flaky auth setup, wrong app/port under test)
- Firestore rules compile warnings or errors
- Firestore index-dependent code about to go live before its new index is serving
- Build/lint/audit failures
- Emulator/env mismatch that makes verification unreliable
- Production Hosting marker mismatch after deploy (`/sw-build-meta.js` does not match the just-built `dist/sw-build-meta.js`)

Only continue after blockers are fixed and checks are rerun cleanly.

Exception for staging callable post-deploy smoke only: `scripts/check-callable-public-access.mjs`
has per-function request timeouts and retries only transient `request_failed`
failures for the same callable. If the Firebase staging deploy body already
completed and the only failure is a callable public-access timeout/network
`request_failed`, rerun only that callable smoke once, or rely on the script's
built-in per-function retry. Continue only when every callable returns an
expected callable JSON response such as `UNAUTHENTICATED` or `INVALID_ARGUMENT`.
Do not apply this exception to 403 platform access failures, 404 missing
functions, unexpected response bodies, missing env/config/secrets, billing or
minimum-cost prompts, deploy-body failures, staging QA failures, or anything
that requires product or infrastructure judgment.

## Downtime / Outage Risk Framing

Firebase Hosting deploys are expected to be atomic and should not create a traditional downtime window. Still, deploys can cause application-level outages if Functions, Firestore rules, Storage rules, indexes, secrets/IAM, or frontend/backend contracts are wrong or roll out in the wrong order.

Treat deploy success as verified surface health, not just a successful Firebase CLI exit. For Hosting, prove the live build marker. For Functions, rules, indexes, and Storage, use the relevant post-deploy checks below and report each requested surface separately.

## Completion and Partial-Failure Rules

Treat deploy completion as surface-specific. A full deploy requests these production surfaces: `Hosting`, `Functions`, `Firestore rules`, `Firestore indexes`, and `Storage rules`. If a full deploy fails partway and a follow-up deploy retries only one surface, report only that surface as complete unless every originally requested surface is reverified.

HTTP 200 is not Hosting deploy proof. It only proves an old or new app shell is reachable. For `full` and `hosting` deploys, the proof is the live `sw-build-meta.js` marker matching the just-built `dist/sw-build-meta.js`.

## Production Version Baseline

Before any production deploy command, read and record the currently live production web build markers. Do this before running the deploy build, because after deployment the old marker is overwritten and cannot be reconstructed reliably from local Git.

```bash
node --input-type=module <<'NODE'
import { parseSwBuildMeta } from './scripts/lib/sw-build-meta.mjs'

const endpoints = [
  'https://perks-react.web.app',
  'https://perks-react.firebaseapp.com',
  'https://perkmon.app',
]

for (const baseUrl of endpoints) {
  const markerUrl = `${baseUrl}/sw-build-meta.js?preDeployCheck=${Date.now()}`
  const response = await fetch(markerUrl, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`${markerUrl} returned HTTP ${response.status}`)
  }
  const metadata = parseSwBuildMeta(await response.text())
  console.log(JSON.stringify({ baseUrl, ...metadata }))
}
NODE
```

Hard stop before production deploy if any production entrypoint cannot be read, returns malformed metadata, or disagrees on `appVersion`, `buildId`, or `releaseTag` when present. Report the mismatch instead of inferring production state from local `package.json`, local tags, or the active branch.

Resolve the production baseline from this live marker before deciding deploy scope:

1. Prefer `releaseTag` when present.
2. If no `releaseTag` exists, derive `v<appVersion>` and explicitly warn that this is version-derived rather than marker-proven.
3. Fetch tags if needed and verify the baseline ref exists.
4. Compare `PROD_REF..TARGET_REF` and the dirty worktree before choosing `full`, `hosting`, `admin`, `functions`, `rules`, `storage`, or `card-assets`.

The deploy report must include the pre-deploy production `appVersion`, `buildId`, endpoint consistency, resolved `PROD_REF`, target ref, changed runtime/config surfaces, and the reason each requested surface was included or skipped. Do not justify a selective production deploy from local branch/tag state alone.

For production `full` and `hosting` deploys, verify all production web entrypoints:

```bash
cat dist/sw-build-meta.js
curl -fsS "https://perks-react.web.app/sw-build-meta.js?deployCheck=$(date +%s)"
curl -fsS "https://perks-react.firebaseapp.com/sw-build-meta.js?deployCheck=$(date +%s)"
curl -fsS "https://perkmon.app/sw-build-meta.js?deployCheck=$(date +%s)"
```

The `appVersion` and `buildId` must match the local `dist/sw-build-meta.js` generated by the deploy build. Do not call production Hosting complete when only `https://perkmon.app` returns HTTP 200.

## Dirty Worktree Handling

Before deploying, classify local changes into one of these buckets:

- **Runtime/config changes** — app source under `src/`, Cloud Functions runtime code under `functions/src/`, Firebase rules, build/deploy scripts, env files, or config files such as `package.json`, `firebase.json`, `vite*.ts`, `tsconfig*.json`, `eslint.config.js`. These are deploy-relevant and must be reviewed as part of the deploy scope.
- **Non-runtime support changes** — docs, `exp/` scripts, test files, `e2e/` support/tests, and similar non-production support artifacts. These do not block deploy by themselves when they are the only uncommitted changes.
- **Temporary/local-only artifacts** — local worktree clones, scratch files, debug logs, and other machine-local files such as `.claude/worktrees/**`. These should be ignored for deploy decisions and should not be committed as part of normal deploy prep.

Deploy rule:

- If the dirty worktree contains only non-runtime support changes plus temporary/local-only artifacts, deploy may continue.
- If temporary/local-only artifacts are present, exclude them from cleanliness checks and leave them uncommitted.
- If non-runtime support changes are present and a clean history is preferred, batch-commit them before continuing, but do not block deploy on them.
- If any runtime/config change is present, treat the worktree as deploy-relevant and review it normally before continuing.

---

## Firestore Index Predeploy Gate

Firestore index builds are long-running operations. A Firebase deploy can expose new Hosting or Functions code before a newly declared Firestore index has finished building, and the dependent query can fail in production with `FAILED_PRECONDITION` / "query requires an index" during that window.

Run this gate before any `full`, `hosting`, `functions`, or specific-function deploy when either condition is true:

- `firestore.indexes.json` changed in the release.
- The release adds or changes a Firestore query shape that may require a composite index or collection-group single-field index, especially new compound `where` filters, `where` plus `orderBy`, collection-group filters/orders, or a query already seen failing with `FAILED_PRECONDITION`.

### Gate Procedure

1. Identify the target and require the normal production acknowledgement before any production command.
2. Deploy indexes alone, without rules, Hosting, or Functions:

```bash
firebase deploy --project staging --only firestore:indexes
```

Production:

```bash
firebase deploy --project prod --only firestore:indexes
```

3. Wait until Firestore reports no in-progress index build operations for the target project:

```bash
gcloud firestore operations list --project perkly-staging-7dab8
```

Production:

```bash
gcloud firestore operations list --project perks-react
```

Treat any `CREATE_INDEX` / `UPDATE_FIELD` operation that is not done as a blocker for dependent code deploy. If an operation is still running, poll or describe it until complete:

```bash
gcloud firestore operations describe OPERATION_NAME --project perks-react
```

4. Only after the needed index operation is complete, continue with the selected deploy path below.
5. In the final report, explicitly say whether the index gate was not applicable, completed, or blocked.

Do not use `npm run deploy:*:rules` as the index-predeploy command when the goal is only to prime indexes. Those scripts deploy both Firestore rules and indexes; use the direct `firebase deploy --only firestore:indexes` command for this gate.

---

## Full Deploy (Hosting + Functions + Rules/Indexes)

Deploys the built frontend, staging legacy redirect hosting, Cloud Functions, and Firestore/Storage rules plus indexes.

Card asset hosting is explicit-only. Do not include `hosting:cardAssets` in full or hosting-only deploys unless card art or card asset hosting config changed and the user explicitly asks for card assets.

If the release is index-dependent, complete the Firestore Index Predeploy Gate before this full deploy. The full deploy may still include `firestore:indexes`, but it must not be the first time a required new index is created for already-live dependent code.

### Staging

// turbo
1. Run from the project root:
```bash
npm run deploy:staging
```

This runs the shared staging workflow script, which:

- runs root lint
- runs `npm run build:staging`
- runs Functions vendor integrity, install, lint, and build checks
- deploys `hosting:web,hosting:legacyStagingRedirect,functions,firestore:rules,firestore:indexes,storage` to Firebase project alias `staging`
- when `FUNCTIONS_DIFF_BASE=<ref>` is provided, compares `<ref>...HEAD` and narrows the staging Functions deploy only when the analyzer can prove the affected exported Functions; ambiguous backend/runtime changes keep the full `functions` deploy
- keeps `perkmon-staging.web.app` as the canonical staging app host and turns the legacy `perkly-staging-7dab8.web.app` site into a Hosting-only redirect entrypoint
- leaves `perkmon-staging-card-assets.web.app` unchanged unless `npm run deploy:staging:card-assets` is run explicitly
- auto-runs strict `npm run staging:qa` against the just-built `sw-build-meta.js` identity after a successful Firebase deploy

Optional diff-aware staging Functions narrowing:
```bash
FUNCTIONS_DIFF_BASE=<base-ref> npm run deploy:staging
FUNCTIONS_DIFF_BASE=<base-ref> npm run deploy:staging:functions
```

This feature is staging-only and default-gated by `FUNCTIONS_DIFF_BASE`; without that env var, staging deploys preserve the full Functions behavior. The analyzer returns `high` confidence for direct exported function entrypoint changes, `medium` confidence for helper changes whose reverse import graph resolves to exported Functions, `none` for no Functions runtime impact, and `low` for ambiguous changes. Low confidence includes `functions/src/index.ts`, deleted Functions sources, `functions/package*.json`, `functions/vendor/**`, `packages/contracts/**`, `packages/shared-runtime/**`, and `firebase.json`; low confidence must widen to full `functions`, not under-deploy.

Manual `npm run staging:qa` is only needed for troubleshooting, when auto-QA was explicitly skipped, or after staging scopes that do not auto-run QA.

Dry-run the checks without deploying:
```bash
npm run check:deploy:staging
```

### Production

// turbo
1. Run from the project root:
```bash
npm run deploy:prod
```

This runs the shared production workflow script, which:

- runs root lint
- runs `npm run build:prod`
- runs Functions vendor integrity, install, lint, and build checks
- deploys `hosting:web,functions,firestore:rules,firestore:indexes,storage` to Firebase project alias `prod`
- verifies the production Hosting build marker on `perks-react.web.app`, `perks-react.firebaseapp.com`, and `perkmon.app` when Hosting is part of the deploy
- leaves production card asset hosting unchanged unless `npm run deploy:prod:card-assets` is run explicitly

> **Note:** Functions have predeploy hooks in `firebase.json` that automatically run `lint` and `build` inside `functions/`.

---

## Selective Deploy

Use these when you only changed one part of the system:

### Hosting Only (frontend changes)

// turbo
1. Build and deploy hosting:
```bash
npm run deploy:staging:hosting
```

For staging, this deploys both the canonical app host and the legacy redirect-only host together so the two staging URLs cannot drift.
It also auto-runs strict `npm run staging:qa` against the just-built `sw-build-meta.js` identity after a successful Firebase deploy.

Production hosting only:
```bash
npm run deploy:prod:hosting
```

Production hosting deploys must end with marker verification against all production web entrypoints. The deploy script performs this automatically; when troubleshooting manually, compare each live `/sw-build-meta.js` response with `dist/sw-build-meta.js`.

### Admin Hosting Only (admin frontend changes)

Admin hosting deploys only the separate admin Hosting site. It does not deploy the public web app, Functions, Firestore rules/indexes, Storage rules, or card assets.

Staging admin hosting:
```bash
npm run deploy:staging:admin
```

Production admin hosting:
```bash
npm run deploy:prod:admin
```

Admin hosting does not currently expose `/sw-build-meta.js`; verify the deploy by command success, the Hosting URL, and an HTTP 200/HTML response from the admin entrypoint:

```bash
curl -fsSI https://stage-admin-perkmon.web.app
curl -fsSI https://admin-perkmon.web.app
```

For production admin deploys, still complete the Production Version Baseline first. The live production web marker establishes the deployed app baseline used for deciding whether admin-only deploy is appropriate, even though the admin site has separate Hosting verification.

### Card Asset Hosting Only (dedicated image site)

Use this only when card art or card asset hosting config changed. Card asset hosting is intentionally excluded from full deploys because the image set rarely changes and large Hosting uploads can be slow or timeout.

```bash
npm run deploy:staging:card-assets
```

Production card assets only:
```bash
npm run deploy:prod:card-assets
```

### Functions Only (Cloud Functions changes)

If the functions change depends on a new Firestore index, complete the Firestore Index Predeploy Gate before deploying functions.

// turbo
1. Deploy functions (auto-lints and builds via predeploy):
```bash
npm run deploy:staging:functions
```

For staging only, you may narrow the Functions target with an explicit diff base:
```bash
FUNCTIONS_DIFF_BASE=<base-ref> npm run deploy:staging:functions
```

If the analyzer reports no Functions impact, the command exits without deploying Firebase resources. If it reports high or medium confidence, the deploy script uses `functions:name` resources and runs callable public-access smoke only for deployed browser-callable Functions. If it reports low confidence, it falls back to full `functions`.

Production functions:
```bash
npm run deploy:prod:functions
```

### Specific Function

If the specific function depends on a new Firestore index, complete the Firestore Index Predeploy Gate before deploying it.

// turbo
1. Deploy a single function by name:
```bash
firebase deploy --project staging --only functions:functionName
```

Production specific function:
```bash
firebase deploy --project prod --only functions:functionName
```

### Firestore Rules/Indexes Only

// turbo
1. Deploy Firestore security rules and composite indexes:
```bash
npm run deploy:staging:rules
```

Production rules/indexes:
```bash
npm run deploy:prod:rules
```

For index priming before dependent code deploy, prefer the Firestore Index Predeploy Gate's direct `firebase deploy --only firestore:indexes` command so rules are not changed as a side effect.

### Storage Rules Only

// turbo
1. Deploy storage rules:
```bash
npm run deploy:staging:storage
```

Production storage:
```bash
npm run deploy:prod:storage
```

---

## Pre-Deploy Checklist

- [ ] For production deploys, capture live production `/sw-build-meta.js` from all production web entrypoints before any deploy command and resolve `PROD_REF`.
- [ ] Compare `PROD_REF..TARGET_REF` plus dirty deploy-relevant files before choosing deploy surfaces.
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build:staging` or `npm run build:prod` completes successfully for the target env
- [ ] Functions vendor integrity: `npm run functions:prepare && npm run functions:check-vendor-integrity`
- [ ] Functions lint: `cd functions && npm run lint`
- [ ] Functions build: `cd functions && npm run build`
- [ ] If `firestore.indexes.json` changed or a new query shape may require an index, complete the Firestore Index Predeploy Gate before dependent Hosting or Functions deploy
- [ ] If card art changed, `npm run sync:card-assets` completes successfully
- [ ] Optional extended check: `RUN_AUDIT=true npm run check:deploy:staging`
- [ ] Optional extended check: `RUN_E2E_LOCAL=true npm run check:deploy:staging` (requires emulators + dev server)
- [ ] Verify `VITE_USE_EMULATORS=false` in the selected hosted env
- [ ] No secrets or `.env` files committed

If any item above fails, **stop deployment** and fix issues first.

## Post-Deploy Verification

- [ ] For Hosting deploys, verify the live build marker, not just page reachability. Production `full` and `hosting` deploys must match `dist/sw-build-meta.js` on `https://perks-react.web.app/sw-build-meta.js`, `https://perks-react.firebaseapp.com/sw-build-meta.js`, and `https://perkmon.app/sw-build-meta.js`.
- [ ] For Admin Hosting deploys, verify the admin Hosting URL returns HTTP 200/HTML (`https://stage-admin-perkmon.web.app` or `https://admin-perkmon.web.app`).
- [ ] Visit the live site and verify pages load after marker verification
- [ ] For staging `full` and `hosting` deploys, confirm `scripts/deploy-firebase.sh` auto-ran strict `npm run staging:qa` with the built `sw-build-meta.js` identity. Run `npm run staging:qa` manually only for troubleshooting, skipped auto-QA, or scopes that do not auto-run QA.
- [ ] If `hosting:cardAssets` was deployed, verify a known card image returns `200 image/png`
- [ ] Check the Firebase Console → Functions for any deployment errors
- [ ] For Functions deploys, confirm browser-callable Functions pass `npm run staging:qa:callables` or the equivalent target-specific callable access smoke. A healthy Firebase callable should return a callable JSON error such as `UNAUTHENTICATED` without credentials, not a Google Frontend `403` HTML page.
  The callable smoke uses per-function request timeouts and retries only
  transient `request_failed` network/timeouts for the same callable, so a single
  slow Cloud Functions request cannot hang the deploy indefinitely. Persistent
  failures still block deploy completion.
- [ ] Check Firebase Console → Hosting for the new deployment entry
- [ ] If the Firestore Index Predeploy Gate ran, confirm no relevant Firestore index operation remains in progress
- [ ] Monitor Cloud Functions logs: `firebase functions:log`

Final reports for full deploys must list each requested surface separately. Do not collapse a partial recovery into "deploy complete" unless every requested surface was verified after the recovery.

## Reference

| Item | Details |
|------|---------|
| Web hosting public dir | `dist/` |
| Card asset hosting public dir | `card-assets/` |
| Functions source | `functions/` (Node 22) |
| Firestore rules | `firestore.rules` |
| Storage rules | `storage.rules` |
| Firebase config | `firebase.json` |
| Safety guard | `src/safety.ts` (prevents emulator config in staging/prod) |
