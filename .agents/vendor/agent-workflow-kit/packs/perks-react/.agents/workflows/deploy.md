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
- Build/lint/audit failures
- Emulator/env mismatch that makes verification unreliable

Only continue after blockers are fixed and checks are rerun cleanly.

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

## Full Deploy (Hosting + Functions + Rules/Indexes)

Deploys the built frontend, staging legacy redirect hosting, Cloud Functions, and Firestore/Storage rules plus indexes.

Card asset hosting is explicit-only. Do not include `hosting:cardAssets` in full or hosting-only deploys unless card art or card asset hosting config changed and the user explicitly asks for card assets.

### Staging

// turbo
1. Run from the project root:
```bash
npm run deploy:staging
```

This runs the shared staging workflow script, which:

- runs root lint
- runs `npm run build:staging`
- runs Functions lint/build
- deploys `hosting:web,hosting:legacyStagingRedirect,functions,firestore:rules,firestore:indexes,storage` to Firebase project alias `staging`
- keeps `perkmon-staging.web.app` as the canonical staging app host and turns the legacy `perkly-staging-7dab8.web.app` site into a Hosting-only redirect entrypoint
- leaves `perkmon-staging-card-assets.web.app` unchanged unless `npm run deploy:staging:card-assets` is run explicitly

After a successful staging deploy, run the fast staging QA gate:

```bash
npm run staging:qa
```

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
- runs Functions lint/build
- deploys `hosting:web,functions,firestore:rules,storage` to Firebase project alias `prod`
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

Production hosting only:
```bash
npm run deploy:prod:hosting
```

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

// turbo
1. Deploy functions (auto-lints and builds via predeploy):
```bash
npm run deploy:staging:functions
```

Production functions:
```bash
npm run deploy:prod:functions
```

### Specific Function

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

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build:staging` or `npm run build:prod` completes successfully for the target env
- [ ] Functions lint: `cd functions && npm run lint`
- [ ] Functions build: `cd functions && npm run build`
- [ ] If card art changed, `npm run sync:card-assets` completes successfully
- [ ] Optional extended check: `RUN_AUDIT=true npm run check:deploy:staging`
- [ ] Optional extended check: `RUN_E2E_LOCAL=true npm run check:deploy:staging` (requires emulators + dev server)
- [ ] Verify `VITE_USE_EMULATORS=false` in the selected hosted env
- [ ] No secrets or `.env` files committed

If any item above fails, **stop deployment** and fix issues first.

## Post-Deploy Verification

- [ ] Visit the live site and verify pages load
- [ ] For staging deploys, run `npm run staging:qa`
  `scripts/deploy-firebase.sh` now auto-runs strict `staging:qa` after staging `full` or `hosting` deploys by passing the built `sw-build-meta.js` identity into the QA step.
- [ ] If `hosting:cardAssets` was deployed, verify a known card image returns `200 image/png`
- [ ] Check the Firebase Console → Functions for any deployment errors
- [ ] Check Firebase Console → Hosting for the new deployment entry
- [ ] Monitor Cloud Functions logs: `firebase functions:log`

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
