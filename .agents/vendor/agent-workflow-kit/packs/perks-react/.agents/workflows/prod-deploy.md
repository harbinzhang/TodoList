---
description: Prepare a production deploy verification report from the current live production version to a target ref
---

# Prod Deploy Prep

## Purpose

Prepare a production deploy readiness report before running `/deploy`. This workflow answers:

- What version/build/tag is currently live in production?
- What user-visible features, risky backend changes, config changes, and data-contract changes exist since that live baseline?
- Which changes can be automatically verified, and which require manual verification?

This workflow does not deploy production.

## Step 1: Establish Scope

1. Confirm the target ref. Default to `HEAD` when the user does not name a branch, tag, commit, or PR.
2. Record the current branch and dirty state:

```bash
git status --short --branch
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
```

3. Classify dirty files:
   - Runtime/config: `src/`, `functions/src/`, `packages/`, Firebase rules/indexes/storage, `package*.json`, `firebase.json`, Vite/TS/ESLint config, deploy scripts, env templates.
   - Verification/support: tests, `e2e/`, monitoring scripts, docs, agent docs.
   - Local artifacts: scratch files, local worktrees, logs, generated temporary files.

Runtime/config dirty files are part of the deploy scope and must appear in the report. Do not modify or revert unrelated dirty files.

## Step 2: Read Live Production Version

Fetch all production Hosting build markers and require consistency:

```bash
node --input-type=module <<'NODE'
import { parseSwBuildMeta } from './scripts/lib/sw-build-meta.mjs'

const endpoints = [
  'https://perks-react.web.app',
  'https://perks-react.firebaseapp.com',
  'https://perkmon.app',
]

for (const baseUrl of endpoints) {
  const markerUrl = `${baseUrl}/sw-build-meta.js?prodDeployPrep=${Date.now()}`
  const response = await fetch(markerUrl, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`${markerUrl} returned HTTP ${response.status}`)
  }
  const metadata = parseSwBuildMeta(await response.text())
  console.log(JSON.stringify({ baseUrl, ...metadata }))
}
NODE
```

Hard stop if any endpoint cannot be read, returns malformed metadata, or disagrees on `appVersion`, `buildId`, or `releaseTag` when present. Report the mismatch before continuing.

Resolve `PROD_REF`:

1. Prefer `releaseTag` from live metadata, normalized as `refs/tags/<releaseTag>`.
2. If `releaseTag` is absent, derive `v<appVersion>` and warn that old hotfix builds can be ambiguous.
3. Refresh tags if the tag is missing locally:

```bash
git fetch origin --tags --prune
git rev-parse --verify refs/tags/<releaseTag>
```

## Step 3: Build the Change Inventory

Use `TARGET_REF=HEAD` unless the user supplied a different target. Set `PROD_REF` to the resolved live production tag/ref from Step 2.

```bash
PROD_REF="refs/tags/<releaseTag>"
TARGET_REF="HEAD"
git merge-base --is-ancestor "$PROD_REF" "$TARGET_REF"
git log --reverse --no-merges --format='%h%x09%s' "$PROD_REF..$TARGET_REF"
git diff --name-status "$PROD_REF..$TARGET_REF"
```

If `PROD_REF` is not an ancestor of `TARGET_REF`, continue only as an analysis report and mark ancestry as a blocker/unknown for release readiness.

Summarize changes by product surface, not by raw commit count:

- Auth/account/profile
- Cards/add-card/catalog/card assets
- Perks/tracker/reminders
- Stripe/billing/entitlements
- Admin/metrics/monitoring
- Notifications/native/mobile
- PWA/service worker/update/versioning
- Firebase rules/indexes/storage/functions
- Data contracts/shared runtime
- Copy/help/SEO/content
- Tests/build/deploy tooling

Use changed paths and nearby tests as evidence. If commit subjects are vague, inspect targeted files with `git show --name-only <sha>` and `git diff PROD_REF..TARGET_REF -- <path>`.

## Step 4: Classify Verification

For each feature or risky change, assign one of:

- `Auto`: deterministic checks can verify behavior well enough before deploy.
- `Manual`: a human must interact with UI/device/provider/live account state.
- `Both`: automated checks cover regressions, but manual smoke remains required.

Prefer `Manual` for:

- Visual/UI layout polish, copy tone, responsive screenshots, and flows without reliable E2E coverage.
- Stripe Checkout/Customer Portal/provider dashboard behavior.
- Push notification registration/delivery on physical iOS/Android devices.
- Email deliverability and external inbox rendering.
- Admin workflows whose success depends on inspecting live/staging records.
- Firestore data repair/backfill outcomes unless a read-only audit proves exact expected state.
- Native store release behavior or App Store/Play Console state.

Prefer `Auto` when the report can cite exact tests or scripts, for example:

- Unit/integration coverage: `npm run test -- <file-or-pattern>`
- Functions: `npm run test:functions`
- Rules: `npm run test:rules`
- Build/bundle/deploy precheck: `npm run check:deploy:prod`, `npm run bundle:check`
- Hosted staging smoke after staging deploy: `npm run staging:qa`
- Callable IAM/public access on staging: `npm run staging:qa:callables`
- E2E release flows: `npm run test:e2e:release`
- Monitoring/audit scripts with read-only project flags

## Step 5: Recommend Auto Verification

Choose the smallest command set that matches the changed surfaces. Do not blindly list every test.

Default baseline for production deploy readiness:

```bash
npm run check:deploy:prod
```

Add targeted checks when relevant:

- Frontend routing/PWA/dependency/Vite/service-worker changes: `npm run bundle:check`
- Shared user journeys: `npm run test:journeys:unit` plus relevant E2E suite
- Firestore rules/index changes: `npm run test:rules`; call out index predeploy gate for `/deploy`
- Functions changes: `npm run test:functions`
- Browser-callable Functions changes: staging callable access smoke after staging deploy
- Native-only changes: native smoke skill/workflow, not this production web deploy workflow

State what each command proves and what it does not prove.

## Step 6: Prepare Manual Verification

Write manual checks as exact flows, not vague labels. Each item should include:

- environment (`staging`, `production read-only`, provider sandbox, physical device)
- account/role needed (`guest`, signed-in user, admin, Stripe test customer)
- navigation or action path
- expected evidence
- cleanup requirement when the check writes staging data

If a manual check would write production data, stop and ask for explicit approval or move it to staging.

## Step 7: Report

Write the final report in Chinese.

Required sections:

1. `当前 Prod`:
   - `appVersion`
   - `buildId`
   - `releaseTag` or derived tag warning
   - endpoint consistency
2. `对比范围`:
   - `PROD_REF..TARGET_REF`
   - target branch/commit
   - ancestry status
   - dirty runtime/config files, if any
3. `变更和验证矩阵`:

| 变更/功能 | 证据 | 验证方式 | 自动验证 | 人工验证 |
|---|---|---|---|---|

4. `建议先跑的自动验证`:
   - exact commands
   - expected evidence
5. `需要人工验的项目`:
   - exact manual checklist
6. `上线前结论`:
   - `READY`
   - `READY_AFTER_CHECKS`
   - `BLOCKED`

Use `BLOCKED` if production marker resolution failed, the baseline tag is ambiguous, `PROD_REF` is not in target ancestry, runtime/config dirty state is unexplained, required indexes are not ready, or high-risk manual checks are undefined.
