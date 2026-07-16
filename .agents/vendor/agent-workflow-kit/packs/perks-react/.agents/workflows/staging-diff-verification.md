---
description: Diff-driven hosted-staging verification with deploy QA evidence reuse, targeted manual/UI checks, staging Firestore evidence, test coverage gap notes, and cleanup
---

# Staging Diff Verification

Use this workflow to turn a deploy-readiness diff into staging evidence. It reuses deploy QA for broad gates and focuses this pass on diff-specific manual comparison, direct logged-in browser operation on hosted staging, staging Firestore inspection or temporary writes, and explicit test coverage recommendations for behavior that should be automated.

This workflow does not deploy staging by itself. If staging is not on the intended build, report that first and ask whether to deploy or continue as environment exploration.

This workflow is not a replacement for `staging-qa` or deploy-time QA. When `deploy:staging`, `staging:qa`, `staging:qa:deep`, or equivalent CI has already passed for the same hosted build marker, do not rerun those broad suites. Cite the prior QA as evidence and spend this workflow on changed-surface inspection, manual comparison, and gaps that deploy QA did not cover.

Core rule for staging-safe writes: if the diff changes a user-write flow that can be exercised with the staging E2E account and restored, do one real hosted-staging UI write, verify the owning Firestore document or Storage object, then clean it up. Do not downgrade these rows to route smoke, unit tests, or unrelated marker-doc probes unless a stop condition applies.

## Prerequisites

- Repo root is `/Users/haibinzhang/mine/react/perks-react` or a valid worktree for this repo.
- Hosted staging is reachable at `https://perkmon-staging.web.app`.
- `.env.staging` and `.env.staging.local` exist, or the shell already has `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`.
- Application Default Credentials are available for Firebase Admin SDK access to `perkly-staging-7dab8`.
- Browser automation is available for direct UI checks. Prefer the in-app Browser plugin when explicitly requested or after frontend changes; use Playwright/E2E only for a narrow gap, not to repeat the broad staging QA gate.

## Step 1: Establish Scope

Record current state before testing:

```bash
git status --short --branch
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
```

Pick the diff range:

- If the user names a baseline or target, use it.
- If continuing from `/prod-deploy`, use its feature/risk list, but verify against staging.
- If hosted staging reports a `releaseTag`, prefer `refs/tags/<releaseTag>` as the target for deployed-staging verification. Do not include local-only agent docs, dirty files, or commits that are not present in the staging build marker.
- If preparing a release branch, prefer `origin/main...HEAD`.
- If validating current unmerged work, use the relevant local branch range and include dirty runtime/config files in scope.

Collect changed paths:

```bash
git diff --name-status <BASE>..<TARGET>
git log --reverse --no-merges --format='%h%x09%s' <BASE>..<TARGET>
```

## Step 2: Confirm Hosted Staging Build

Read the staging build marker:

```bash
curl -fsS 'https://perkmon-staging.web.app/sw-build-meta.js'
```

If a specific staging deploy is expected, compare `appVersion`, `buildId`, and `releaseTag` against the intended build. If they do not match, mark verification as `BLOCKED` for deploy readiness unless the user explicitly wants exploratory testing on the current staging build.

Before running any tests, check whether deploy-time QA already ran for this exact build marker. Accept evidence from the deploy transcript, CI run, or a user-provided deploy summary. If it covered the broad staging gates, record it in the matrix and skip those commands here.

## Step 3: Build the Diff Coverage Matrix

Map changed paths to verification lanes.

| Changed surface | Prior QA / targeted command lane | Browser lane | Firestore lane |
|---|---|---|---|
| `src/features/cards`, `src/features/user`, card forms | reuse deploy QA; targeted Vitest only if prior QA missed the changed component | login, add/edit/search cards, verify detail page | inspect `userCards`, custom card docs, cleanup temp cards |
| `src/features/perks`, `src/features/benefits-tracker` | reuse deploy QA; targeted Vitest only if prior QA missed the changed component | add/edit perk, filter/tag, mark used/undo | inspect `userCardBenefitsTracking`, custom benefits, cleanup |
| `src/features/admin` | targeted Vitest/functions tests | staging admin page flow | inspect affected admin collections/jobs |
| `functions/src/callable`, `functions/src/workers` | changed contract test or bounded touched-callable probe; do not run all functions if deploy QA already did | callable-backed UI smoke if exposed | read/write exact staging docs involved |
| `packages/contracts`, `packages/shared-runtime` | targeted shared-runtime/contract test only for uncovered schema changes | only if behavior surfaces in UI | inspect document shape and runtime validation results |
| `firestore.indexes.json`, rules/storage | targeted query/index proof only if deploy QA did not already cover it | usually none | confirm required staging index/query succeeds |
| `apps/chrome-extension` | reuse deploy/extension QA; run a specific replay only for changed provider behavior not already covered | direct loaded-extension check only when needed | inspect imported offers or extension metrics if synced |
| styling/layout-only UI | targeted Vitest where present | direct page inspection and screenshot | none unless state must be seeded |

Do not list every changed file. Group by user-visible surface and risk.

Mark a matrix row as `safe-write-required` when it touches any of these flows and the hosted staging build includes the behavior:

- card art upload or removal: create or edit a staging E2E card through the UI, verify `userCustomCards.cardArtUrl`, verify the Storage object metadata, delete the card/link/object, and report residual counts.
- custom card or membership creation/edit/delete: perform the UI write, verify `userCustomCards` and linked `userCards`, then delete only the marked documents.
- custom perk creation/edit/delete: perform the UI write, verify `userCustomCardBenefits` fields and list/search visibility, then delete only the marked documents.
- tracker mark-used/undo or amount tracking: snapshot affected tracking docs, click the UI control, verify `userCardBenefitsTracking`, run Undo or restore the snapshot, and report final changed-doc count.
- settings/profile/preferences save: snapshot original values, save through UI, verify Firestore and reload state, then restore originals.

For a `safe-write-required` row, generic route smoke, existing unit coverage, or a standalone `agentVerificationRuns` marker doc is not enough evidence. Those checks may supplement the row, but they do not replace the real product write.

Valid stop conditions for skipping a `safe-write-required` row:

- hosted staging is not on the target build or does not expose the feature yet
- staging credentials or the required admin role are unavailable
- the flow would send real email, payment, bank/provider, Google, Apple, or third-party traffic without an approved mock/replay lane
- the write cannot be safely restored or cleanup risk is higher than the verification value
- the user explicitly requests a read-only or no-write pass

While building the matrix, also classify testability. If a changed feature can or should be covered by automated tests, record it as a test coverage recommendation instead of silently relying on manual staging verification.

Use this triage:

- Unit/component test: deterministic rendering, validation, formatting, reducers/hooks, feature flags, date or amount logic.
- Contract/functions test: callable input/output shape, runtime validation, permission boundaries, backend branching.
- Firestore rules/integration test: security rules, query/index shape, persisted document schema.
- E2E/replay test: critical user journeys, browser-only behavior, extension provider behavior with existing mock/replay fixtures.
- Manual-only: subjective visual polish, physical device behavior, real third-party login, provider dashboards, email inbox rendering.

Do not write new tests during this workflow unless the user explicitly asks for implementation. The default output is a concrete recommendation: feature, recommended test layer, suggested file or suite, and why the coverage matters.

## Step 4: Reuse QA and Run Only Gap-Filling Commands

Default behavior after a staging deploy is to skip broad test commands. Do not run these unless the user explicitly asks for a rerun, the prior deploy QA is missing, or the command is the only practical proof for a changed surface:

```bash
npm run test:journeys:unit
npm run test:functions
npm run test:rules
npm run staging:qa
npm run staging:qa:deep
npm run test:e2e:staging:readonly
npm run test:e2e:staging:write
npm --prefix apps/chrome-extension run typecheck
npm --prefix apps/chrome-extension run test
npm --prefix apps/chrome-extension run build
npm run test:e2e:extension:staging
npm run test:e2e:extension:amex:replay
```

When a command is needed, choose the smallest command set that covers an uncovered matrix row:

- Prefer a changed test file over a package-wide suite.
- Prefer a single touched callable probe over `npm run staging:qa:callables`.
- Prefer one browser route/action over `npm run test:e2e:staging` or `npm run staging:qa:deep`.
- Prefer direct Firestore readback over creating extra product data when deploy QA already exercised that same product write on the same hosted build marker.
- Stop if a broad command starts by mistake and the user confirms deploy QA already covered it.

Source staging env files for staging E2E:

```bash
set -a
source .env.staging
[[ -f .env.staging.local ]] && source .env.staging.local
set +a
```

If tracker derivation, cadence, deterministic tracking IDs, or used-state persistence is central to the diff, load `.agents/workflows/staging-tracker-verification.md` and run that workflow instead of improvising.

For broad backend changes, reuse deploy QA first. Run `npm run test:functions` only when that evidence is absent or stale for the current build. For a narrow callable diff, prefer the changed callable contract tests plus a bounded staging API reachability probe. Do not use an unbounded all-callables online check as a default gate; run only the touched callables and give each request a timeout.

Bounded callable reachability pattern:

```bash
node --input-type=module <<'NODE'
import { checkCallablePublicAccess } from './scripts/lib/callable-public-access.mjs'
const projectId = 'perkly-staging-7dab8'
const functionNames = ['getExtensionBootstrapData', 'listImportedOffers']
const fetchImpl = async (url, init) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('request timeout after 8000ms')), 8000)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
const results = await checkCallablePublicAccess({ projectId, functionNames, fetchImpl })
console.log(JSON.stringify(results, null, 2))
if (results.some((result) => !result.ok)) process.exitCode = 1
NODE
```

## Step 5: Log Into Staging for Browser UI Verification

Use hosted staging:

```text
https://perkmon-staging.web.app
```

Login with `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` from the sourced staging environment. If credentials are unavailable, stop browser verification and report the missing prerequisite.

For each UI flow:

1. Navigate to the changed route.
2. Perform the exact action a user would perform.
3. Observe both UI feedback and persisted state when relevant.
4. Capture a screenshot or exact visible text/URL/element state when useful.
5. Avoid broad exploratory clicking that is unrelated to the diff.

For `safe-write-required` rows, "perform the exact action" means completing the actual product write through hosted staging UI. Do not stop after proving the page renders. If the UI write fails, keep the Firestore/Storage snapshot and cleanup evidence in the report.

Do not rerun the whole remote smoke suite just to reach one page. Navigate directly to the changed route and record the observed user-visible behavior.

Recommended browser checks by surface:

- Cards: add card/search, card detail, nickname/display name, custom card benefit editor.
- Perks: AddPerkPage, perk list filtering/grouping, bonus/currency/availability fields.
- Tracker: benefits tracker filters, mark-used/undo, deadline and status display.
- Dashboard/onboarding: welcome CTAs, recommended steps, unclaimed value display.
- Admin: suggestion review, migration decision panel, metrics/ops pages.

## Step 6: Use Staging Firestore for Evidence

Default to reads. Write only when needed to prove persistence, trigger behavior, or cleanup.

Use project `perkly-staging-7dab8`.

Inline Firestore pattern:

```bash
cd functions && npx tsx -e "
import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'perkly-staging-7dab8' });
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
// read or write narrowly scoped staging docs here
"
```

Rules for writes:

- Restrict writes to the staging E2E user unless the user explicitly approves a broader staging mutation.
- Add marker fields or distinctive names like `codex-staging-diff-<short-id>` or `staging-diff-<timestamp>`.
- Snapshot original values before mutating an existing doc.
- Prefer creating temporary docs over changing long-lived staging fixtures.
- For `userCards`, delete derived `userCardBenefitsTracking` rows before deleting the temp card.
- For settings/profile writes, restore original values.

When the diff is broad and E2E already performed product writes, add a short residual probe before any extra mutation:

- Count/read the staging E2E user's affected collections.
- If needed, create one isolated marker doc outside product collections, read it back, delete it, then re-read to prove cleanup.
- Do not create additional product cards/perks/trackings when the same hosted build already has equivalent product-write evidence. If the changed behavior is the product write itself and no equivalent evidence exists, create the minimum marked product data needed for proof and clean it up.

Evidence standard for staging-safe writes:

- UI: route, action, visible feedback, and any user-facing persisted visibility such as list/search/detail.
- Firestore/Storage: collection or bucket path, document/object ID, key fields that prove the changed behavior, and before/after values for existing docs.
- Cleanup: exact deleted/restored IDs and a final residual count. If a snapshot restore was needed, report how many documents/objects were restored.

If direct Firestore work becomes more than a short read/write/readback, follow `.agents/workflows/run-firestore-script.md` and create a script under `exp/functions-scripts/`.

## Step 7: Cleanup and Baseline Restore

Before reporting success:

1. Delete temporary docs created by the workflow.
2. Restore modified fixture fields.
3. Re-read the affected collections/docs.
4. Report counts and document IDs proving cleanup.

If cleanup fails, the final status cannot be `PASS`; use `BLOCKED` or `PASS_WITH_RISK` and list exact leftovers.

## Step 8: Classify Gaps

Use `未覆盖/需人工` for:

- real bank/provider login flows without approved replay/mock support
- physical iOS/Android device behavior
- email deliverability or external inbox rendering
- Stripe/provider dashboard state
- subjective visual polish that needs human review
- missing staging credentials or admin role

Do not hide these gaps inside prose.

## Report Format

Write the final report in Chinese:

```text
目标和环境
- range/ref:
- staging build:
- account/role:

Diff 覆盖矩阵
| 变更面 | 验证动作 | 证据 | 结果 |

自动验证
- reused deploy QA or targeted command: result + key evidence

浏览器验证
- route/action: observed evidence

Firestore 验证
- collection/doc ids read or written
- cleanup result

测试覆盖建议
- feature:
- recommended layer/file:
- reason:

未覆盖/需人工
- exact gap and reason

结论
- PASS / PASS_WITH_RISK / BLOCKED
```
