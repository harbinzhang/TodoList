---
description: Prepare an exact patch-tagged candidate on release-branch, fully validate it on staging, promote the same tag and SHA to main, publish Latest, and reconcile ship-created support fixes to dev
---

# Ship Workflow

Use this workflow when the user wants the exact `release-branch` branch shipped
through a staging-first patch promotion: prepare and tag the final candidate
on `release-branch`, verify that explicitly tagged immutable build on Firebase
staging, refresh the latest validated `origin/dev` roadmap snapshot, finish the
matching staging Admin deployment and verification, then merge the same tag
and SHA into `main`, publish it as the repository's Latest GitHub Release, and
reconcile any ship-created support-only fixes back to `dev` through a minimal
PR without carrying release version commits.

If the task is really a production hotfix from a released tag, or only a narrow ordered cherry-pick should ship while current branch work stays out, use `.agents/workflows/hotfix.md` instead of adapting `ship`.

Every ship run uses the fixed branch named `release-branch` as the release source. If the user invokes the skill with a branch name, for example `$ship feature/my-branch`, treat that name as an optional remote source branch. Fetch and merge `origin/<branch>` into `release-branch` before the normal workflow starts. After that optional sync, the first normal workflow step remains syncing `release-branch` from remote `main`.

This workflow composes existing canonical workflows:

- `.agents/workflows/release.md` for the ship-only staging-first tagged
  candidate and post-staging `main` promotion path
- `.agents/workflows/i18n-staging-sync.md` for pre-staging i18n catalog and changed-key review-ledger blockers
- `.agents/workflows/deploy.md` for Firebase staging deploy
- `.agents/workflows/staging-qa.md` for the default post-deploy staging gate
- `.agents/workflows/staging-user-journey-verification.md` for broader journey validation when needed
- `.agents/workflows/staging-tracker-verification.md` for tracker-specific deep validation when needed
- `.agents/skills/roadmap/SKILL.md` for roadmap source-of-truth and hosted validation rules

## Scope

- Check out the exact local branch `release-branch` tracking `origin/release-branch`.
- Review and commit intended `release-branch` changes.
- Optionally sync a user-provided remote branch into `release-branch` before the remote `main` sync.
- Sync `release-branch` from remote `main` before final release-prep commits.
- Push `release-branch`.
- Align root dependencies and run a scope-aware local verification gate before the release workflow.
- Run the read-only i18n staging sync gate before the release workflow and repair only i18n blockers that belong to the release scope.
- Use local verification only. Do not use GitHub Actions, GitHub PR checks, or remote CI as a ship gate.
- Prepare a `patch`-bumped annotated candidate tag on `release-branch` without
  checking out or mutating `main`.
- Prove the pushed annotated tag, `release-branch` `HEAD`, built marker, and live staging marker all use the same release tag.
- Deploy the exact release-tagged build to Firebase staging.
- Run the default staging QA gate.
- Run targeted staging verification when the released change warrants it.
- Publish the exact latest validated `origin/dev` roadmap snapshot to staging Firestore.
- Deploy the released admin build to staging admin Hosting as the final step.
- Verify the hosted `/admin/roadmap` route reports the published `origin/dev` SHA.
- Only after every staging surface and validation gate passes, merge the exact
  staged tag into `main` from the primary worktree and run the `main`
  `release:verify` promotion gate.
- Publish the matching GitHub Release as a published non-prerelease Latest
  release only after `main` promotion passes.
- Reconcile support-only commits created by this ship to `dev` through a
  minimal PR after release publication. Never merge the full release/tag
  lineage or version-prep commit into `dev`.

Out of scope:

- Production deploys
- iOS or Android store uploads
- Minor or major releases
- Creating temporary release branches or using detached worktrees to impersonate
  `main`. The fixed `release-branch` branch, the repository's policy-approved
  primary worktree for `main`, one clean detached `origin/dev` worktree used
  only for staging roadmap publication, and one clean temporary branch
  worktree used only for the support-only `dev` reconciliation PR are the only
  worktrees used by this workflow.
- Watching, rerunning, waiting for, or relying on GitHub Actions / PR checks / remote CI. If verification is needed, run the equivalent local command and report that local evidence.

## Prerequisites

- `origin/release-branch` exists and can be checked out as local branch `release-branch`.
- Any starting branch is only the invocation context; it is not the release source.
- If a branch argument is provided, it names a remote branch to merge into `release-branch`; it is not a request to check out that branch.
- `release-branch` can accept a merge from `origin/<branch-argument>` when a branch argument is provided.
- `release-branch` can accept a merge from `origin/main` before release prep is finalized.
- Node dependencies can be installed at the repo root from `package-lock.json`.
- GitHub CLI is authenticated with permission to create or edit repository
  Releases and to create, inspect, and merge the support-only reconciliation
  PR by the post-staging publication phase. Missing GitHub capability does not
  block staging deployment, but it blocks final ship completion.
- Firebase CLI is authenticated for staging deploys.
- `.env.staging` points at `perkly-staging-7dab8` with `VITE_USE_EMULATORS=false`.
- `.env.staging.local` or the shell environment provides staging E2E credentials when staging tests need them.
- `.env.staging.local` provides the fixed
  `xic9967+staging-e2e@gmail.com` credentials and separate
  `STAGING_QA_ADMIN_EMAIL/PASSWORD` credentials.
- Application Default Credentials are available for Firebase Admin SDK staging checks.
- `gh` is authenticated for the strict hosted roadmap PR reconciliation.

## Hard Stops

Stop and report before continuing if any of these occur:

- An unrelated runtime/config change is present and the user has not confirmed it belongs in the ship.
- A secret, real env file, scratch artifact, or local-only file would be committed.
- `origin/release-branch` is missing, cannot be fetched, or local state prevents checking out `release-branch` safely.
- A provided branch argument does not exist on `origin`.
- `origin/<branch-argument>` cannot be merged cleanly into `release-branch`.
- `origin/main` cannot be merged cleanly into `release-branch`.
- The primary worktree required by repository policy for `main` cannot be made
  safely available after staging validation. Do not delete, overwrite, or
  silently stash ambiguous work merely to finish promotion; leave the
  validated staging checkpoint resumable and report promotion pending.
- Root dependency alignment fails, or `npm install` changes `package.json` / `package-lock.json` in a way that is not clearly an intentional lockfile alignment for the finalized release source.
- The scope-aware local verification gate fails before the release workflow.
- The i18n staging sync gate fails and the blockers cannot be repaired, reviewed, committed, pushed, and reverified safely within the release scope.
- Ship-local emulator takeover fails: standard Firebase emulator or local E2E dev-server ports remain occupied after verified emulator/test/dev listeners are terminated and rechecked.
- The Functions vendor integrity preflight finds that `functions/vendor/*.tgz` does not match `functions/package-lock.json`, unless the mismatch is refreshed, verified, committed, and pushed before release.
- `npm run release:verify` fails on the source candidate, bumped/tagged
  candidate, or post-staging promoted `main` tree and the failure cannot be
  fixed, verified, committed, pushed, and retried safely within the ship scope.
- The patch release tag cannot be created or pushed.
- The pushed annotated tag does not peel to the exact release commit checked out on `release-branch`.
- After staging and `main` promotion pass, the matching GitHub Release cannot
  be published as a non-draft, non-prerelease Latest release, or GitHub
  resolves a different release as Latest afterward.
- `release-branch` is not checked out at the exact release tag immediately before the staging deploy.
- The staging deploy's local `dist/sw-build-meta.js` or live staging `/sw-build-meta.js` omits the explicit `releaseTag` or reports a tag different from the shipped tag.
- After staging validation, branch protection or repository settings require
  GitHub CI status checks before the tagged candidate can merge. Report the
  promotion blocker instead of waiting for, rerunning, or using remote CI; do
  not misreport the already completed staging deployment as failed.
- `npm run deploy:staging` fails or reports unusual Firebase/environment errors that cannot be fixed, verified, committed, pushed, and retried safely within the ship scope.
- Staging QA or targeted staging verification fails and the failure cannot be fixed, verified, committed, pushed, and retried safely within the ship scope.
- The exact fetched `origin/dev` checkout cannot be materialized cleanly, its root or Functions dependencies cannot be installed, or its publisher runtime does not match that SHA.
- `npm run roadmap:publish:staging` fails its strict hosted roadmap check, export, size check, or staging Firestore write.
- The temporary detached roadmap publication worktree is dirty or cannot be removed cleanly.
- `npm run deploy:staging:admin` fails or reports unusual Firebase/environment errors that cannot be fixed, verified, committed, pushed, and retried safely within the ship scope.
- The hosted staging `/admin/roadmap` route does not load the published snapshot or reports a source SHA different from the published `origin/dev` SHA.
- Temporary staging records cannot be cleaned up.
- The ship checkpoint cannot be created/resumed, its Git/tag/build identity
  changes unexpectedly, or a frozen artifact digest no longer matches.
- `npm run ship:preflight:staging` fails before release mutation.
- The dev reconciliation planner finds runtime or unclassified paths, a
  malformed release-version commit, a cherry-pick conflict, an unclean
  temporary worktree, or a PR that cannot be reviewed and merged safely.

Callable public-access postcheck exception: if `npm run deploy:staging` has
already completed the Firebase staging deploy body and fails only in the
post-deploy callable public-access smoke with a timeout or network
`request_failed`, retry only that callable smoke once, or rely on the
checker's built-in per-function retry. Continue to staging validation only if
every callable returns an expected callable JSON response such as
`UNAUTHENTICATED` or `INVALID_ARGUMENT`. This exception does not apply to 403
platform access failures, 404 missing functions, unexpected response bodies,
missing env/config/secrets, billing or minimum-cost prompts, failures during
the deploy body, staging QA failures, product/runtime validation failures, or
anything requiring product or infrastructure judgment.

If a release verification, deploy, or staging-validation blocker is clearly repairable and belongs to the current release scope, repair it before stopping: make the narrow fix, run the smallest local command that proves the fix, commit only the intended files, push the affected branch, and retry from the failed phase. Do not continue past the failed phase on an uncommitted or unpushed fix. Still hard stop immediately for safety issues, secrets, ambiguous unrelated changes, merge uncertainty, unclean cleanup, or blockers that remain after the focused retry.

## Phase 0: Check Out Fixed Release Branch

Record the starting branch for reporting only:

```bash
STARTING_BRANCH=$(git rev-parse --abbrev-ref HEAD)
```

Inspect the scoped worktree before switching branches:

```bash
git status --porcelain -- . ':(exclude).claude/worktrees/**'
git diff --stat
git diff
git ls-files --others --exclude-standard
```

Classify dirty files using the Phase 2 rules. If local edits would prevent checking out `release-branch`, protect intentional work without committing local-only artifacts or secrets. Hard stop when the dirty state is unclear, unrelated, or unsafe to carry.

Fetch and check out the exact release branch:

```bash
git fetch origin "+refs/heads/release-branch:refs/remotes/origin/release-branch"
git rev-parse --verify origin/release-branch
git checkout release-branch 2>/dev/null || git checkout -b release-branch --track origin/release-branch
git pull --ff-only origin release-branch
```

After this phase, `CURRENT_BRANCH` for the rest of the workflow must be `release-branch`:

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
test "$CURRENT_BRANCH" = release-branch
```

## Phase 0.25: Initialize Or Resume The Ship Checkpoint

Use one stable run ID for the entire ship. Automation should derive it once
from the scheduled execution identity; an interactive run may use UTC time
plus the source short SHA.

```bash
SHIP_RUN_ID="${SHIP_RUN_ID:-daily-ship-dev-$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)}"
SHIP_STATE=".firebase/ship-runs/${SHIP_RUN_ID}/state.json"
if test -f "$SHIP_STATE"; then
  npm run ship:checkpoint -- assert --repo-root "$PWD" --run-id "$SHIP_RUN_ID"
else
  PERKMON_BUILD_TIME="${PERKMON_BUILD_TIME:-$(node -e 'process.stdout.write(new Date().toISOString())')}"
  npm run ship:checkpoint -- init \
    --repo-root "$PWD" \
    --run-id "$SHIP_RUN_ID" \
    --source-branch release-branch \
    --release-branch release-branch \
    --source-sha "$(git rev-parse HEAD)" \
    --release-sha "$(git rev-parse HEAD)" \
    --build-time "$PERKMON_BUILD_TIME"
fi
export SHIP_RUN_ID
export PERKMON_BUILD_TIME="$(node -e '
  const fs = require("fs")
  process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).buildTime)
' "$SHIP_STATE")"
```

Do not regenerate either value during resume. Record `worktree_sync` after the
named-branch and remote-main synchronization finishes. As commits move the
finalized source tip before release, update `sourceSha` and `releaseSha`
through the checkpoint identity compare-and-set command; never hand-edit
`state.json`.

## Phase 0.5: Optional Sync From Named Remote Branch

Run this phase only when the user provides a branch argument after `ship`, such as `$ship feature/my-branch`.

Normalize the argument as a remote branch name:

- strip a leading `origin/` if the user included it
- do not treat the argument as a request to switch branches
- if the normalized branch is `main`, skip this phase and rely on Phase 1

Confirm the release branch:

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
test "$CURRENT_BRANCH" = release-branch
```

Fetch and verify the named remote branch:

```bash
SYNC_BRANCH=<branch-argument-without-origin-prefix>
git fetch origin "+refs/heads/${SYNC_BRANCH}:refs/remotes/origin/${SYNC_BRANCH}"
git rev-parse --verify "origin/${SYNC_BRANCH}"
```

Inspect the scoped worktree before attempting this merge:

```bash
git status --porcelain -- . ':(exclude).claude/worktrees/**'
git diff --stat
git diff
git ls-files --others --exclude-standard
```

Use the same dirty-file classification rules as Phase 1. If local edits would prevent merging `origin/${SYNC_BRANCH}`, protect the intentional work without committing local-only artifacts or secrets.

Merge the named remote branch into `release-branch`:

```bash
git merge --no-edit "origin/${SYNC_BRANCH}"
```

If conflicts occur, resolve them on `release-branch`, run the smallest relevant verification for the resolved files, and commit the merge/conflict resolution before continuing. If the conflicts are broad or ambiguous, stop and report the conflicted files.

After this phase succeeds, continue to Phase 1. Do not skip the remote `main` sync.

## Phase 1: Sync From Remote Main

The first release-risk check is whether `release-branch` can absorb the latest remote `main`. Do this before final release-prep commits and before invoking the release workflow so conflicts are found early.

Confirm the release branch:

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
test "$CURRENT_BRANCH" = release-branch
```

Fetch the latest remote state:

```bash
git fetch origin main
```

Inspect the scoped worktree before attempting the merge:

```bash
git status --porcelain -- . ':(exclude).claude/worktrees/**'
git diff --stat
git diff
git ls-files --others --exclude-standard
```

Classify dirty files:

- **Intended release changes**: implementation, tests, docs, scripts, contracts, rules, or config that are part of the current ship.
- **Non-release support changes**: docs, tests, E2E support, or `exp/` scripts that are clearly related and can be committed before release.
- **Temporary/local-only artifacts**: local worktrees, scratch files, logs, generated reports, and machine-only files. Do not commit these.
- **Blockers**: unrelated runtime/config changes, secrets, real `.env` changes, or any file whose purpose is unclear.

If local edits would prevent merging `origin/main`, protect the intentional work without committing local-only artifacts or secrets. Use the least surprising option for the state in front of you:

- commit already-reviewed intended changes before the sync when they are clearly part of the ship
- stash only reviewed non-secret local edits if a temporary stash is safer than a prep commit
- stop and ask for direction when unclear or unrelated runtime/config changes are present

Merge remote `main` into `release-branch`:

```bash
git merge --no-edit origin/main
```

If conflicts occur, resolve them on `release-branch`, run the smallest relevant verification for the resolved files, and commit the merge/conflict resolution before continuing. If the conflicts are broad or ambiguous, stop and report the conflicted files.

Freeze the reconciliation baseline immediately after the named-branch and
remote-main merges, before Phase 2 can create ship-specific prep or repair
commits. This separates changes introduced by this run from pre-existing
release history:

```bash
RECORDED_DEV_RECONCILIATION_BASE_SHA="$(node -e '
  const fs = require("fs")
  const state = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
  process.stdout.write(state.devReconciliationBaseSha ?? "")
' "$SHIP_STATE")"
if test -z "$RECORDED_DEV_RECONCILIATION_BASE_SHA"; then
  SHIP_DEV_RECONCILIATION_BASE_SHA="$(git rev-parse HEAD)"
  npm run ship:checkpoint -- identity \
    --repo-root "$PWD" \
    --run-id "$SHIP_RUN_ID" \
    --expect-missing-dev-reconciliation-base \
    --dev-reconciliation-base-sha "$SHIP_DEV_RECONCILIATION_BASE_SHA"
else
  SHIP_DEV_RECONCILIATION_BASE_SHA="$RECORDED_DEV_RECONCILIATION_BASE_SHA"
  git merge-base --is-ancestor "$SHIP_DEV_RECONCILIATION_BASE_SHA" HEAD
fi
export SHIP_DEV_RECONCILIATION_BASE_SHA
```

Resume must reuse this exact baseline. Never move it forward to hide a
ship-created commit from reconciliation.

## Phase 2: Commit Current Ship Changes

Commit only intended files on `release-branch`. Prefer multiple focused commits if the dirty set has separable concerns; otherwise use one conventional commit:

```bash
git add <intended-files-only>
git commit -m "chore: prepare patch ship"
git push origin HEAD
```

If there are no intended dirty files, record that no prep commit was needed and continue from the existing `release-branch` tip.

Push `release-branch` after the remote-main sync and prep commits:

```bash
git push origin HEAD
```

## Phase 2.5: Align Root Dependencies

Run this after the finalized release source branch has been synced and prep
commits have been pushed. Do it before choosing or running local verification
commands. Do not inspect, remove, or switch the primary `main` worktree during
this pre-staging phase.

Branch sync can change `package.json` / `package-lock.json` while leaving the local `node_modules` tree stale. Always refresh the root install from the current release source before local E2E, builds, or release verification, even if `node_modules` already exists:

```bash
npm install
git diff --exit-code -- package.json package-lock.json
```

Rules:

- If `npm install` only updates `node_modules`, continue and record the dependency alignment as clean.
- If `package-lock.json` changes and the diff is a clear lockfile alignment for already-intended `package.json` dependency changes in the release source, commit and push that lockfile update before continuing.
- If `package.json` changes, or the lockfile diff is unrelated, ambiguous, or looks like registry/version drift, hard stop and report the dependency alignment blocker.
- If `npm install` fails due to network, registry, lifecycle-script, or package-resolution errors, hard stop and report the install failure instead of treating later module-resolution failures as product bugs.

## Phase 3: Scope-Aware Local Verification

Run this gate after the fixed release-branch checkout, optional named-branch
sync, remote `main` sync into `release-branch`, prep commits, branch push, and
root dependency alignment, but before preparing the tagged candidate. The
gate should prove the finalized `release-branch` tip without turning every
daily ship into a full local E2E run or duplicating the release workflow's
mandatory `npm run release:verify` gates.

Always inspect the effective release diff before choosing targeted checks:

```bash
git diff --name-only origin/main...HEAD
```

The release workflow still owns the three baseline local release gates in
staging-first order: source `release-branch`, final bumped/tagged candidate,
then the post-staging promoted `main` tree. This phase adds only the targeted
local checks that are not already guaranteed by that baseline.

Run the pre-staging i18n sync gate before release:

```bash
npm run i18n:staging-gate -- --base origin/main
```

Rules:

- Treat `test-results/i18n-staging-sync-report.json` as the source of truth.
- If the gate fails only on missing locale keys, placeholder/tag/plural drift, quality errors, or changed P0/P1 review-ledger blockers, use `.agents/workflows/i18n-staging-sync.md` to repair them in the current `release-branch` scope, commit only the i18n files, push, and rerun the gate.
- If the gate report has `needsCriticalSmoke: true`, add `npm run test:e2e:i18n-critical` to the targeted local checks in this phase.
- Hard stop on gate runtime errors, unrelated product/layout/runtime issues, or translations that cannot be reviewed well enough to mark changed P0/P1 copy.

Always run the Functions vendor integrity preflight in this phase because `ship` performs a full staging deploy that includes Cloud Functions. This catches stale or regenerated local tarballs before Cloud Build runs `npm ci` against `functions/package-lock.json`:

```bash
npm run functions:prepare
npm run functions:check-vendor-integrity
npm --prefix functions ci --ignore-scripts
git diff --exit-code -- functions/package-lock.json functions/vendor/perkmon-contracts.tgz functions/vendor/perkmon-shared-runtime.tgz
```

If the integrity check fails or the diff command shows `functions/package-lock.json` or `functions/vendor/*.tgz` changed, refresh them intentionally, verify, commit, and push before invoking the release workflow:

```bash
npm run functions:prepare
cd functions && npm install ./vendor/perkmon-contracts.tgz ./vendor/perkmon-shared-runtime.tgz --package-lock-only --ignore-scripts && cd ..
npm run functions:check-vendor-integrity
git add functions/package-lock.json functions/vendor/perkmon-contracts.tgz functions/vendor/perkmon-shared-runtime.tgz
git commit -m "chore: refresh functions vendor packages"
git push origin HEAD
```

Do not defer this mismatch to `npm run release:verify` or `npm run deploy:staging`; the purpose of this gate is to prove the finalized release source branch has deployable Functions vendor artifacts before the release tag is cut.

Select targeted local checks based on the changed paths and behavior:

- Run `npm run test:vite-runtime-isolation` when the diff touches root dependencies, Vite config, dependency optimization, lazy dependency boundaries, routing, PWA/service-worker wiring, Firebase imports/config, or shared providers in ways that can change the dev-runtime module graph. Pair it with `npm run bundle:check` when the same change can affect the production bundle.
- Run `npm run test:rules` when the diff touches Firestore rules, rules tests, auth/admin role enforcement, write-boundary code, or any Firestore read/write permission behavior.
- Run `npm run test:e2e:i18n-critical` when the i18n staging sync report sets `needsCriticalSmoke: true`.
- Run the smallest relevant local E2E or journey lane when the diff touches auth, dashboard, wallet/cards, tracker UI, settings, routing, onboarding, or other user-visible flows where unit/build coverage does not exercise the workflow.
- Run tracker-focused local tests when the diff touches benefit cadence logic, `userCards`, `userCardBenefitsTracking`, deterministic tracking IDs, deadline/date normalization, or trigger-generated tracker rows.
- Run functions-focused targeted tests/builds when the diff touches Cloud Functions runtime code, scheduled jobs, triggers, or callable contracts and the specific changed surface needs more than the baseline Functions suite.

Use the lightest command that proves the changed behavior. Examples include targeted Vitest files, a focused Playwright project/spec, `npm run test:journeys:local`, `npm run test:e2e:local:auto`, or `npm run test:rules` when those are the right fit for the changed surface.

For ship local verification, the standard Firebase emulator ports and the local E2E dev-server port are ship-owned resources. Before running local E2E, journey, rules, or emulator-backed Functions checks, take over those ports instead of stopping for another local run:

```bash
lsof -nP -iTCP:4173 -iTCP:8080 -iTCP:9099 -iTCP:9199 -iTCP:4000 -iTCP:4400 -iTCP:4500 -iTCP:5001 -iTCP:9150 -sTCP:LISTEN
ps -axo pid,ppid,lstart,command | rg 'firebase|emulator|vite|playwright|vitest|npm run test|npm run dev|perks-react|perkmon'
```

If those ports are occupied by Firebase emulators, Vite dev servers, Playwright, Vitest, repo test runners, or another local repo's emulator/test run, terminate them so the ship check can start cleanly. Prefer normal termination first, then use `kill`/`kill -9` only for listeners that remain after a short wait. Re-run `lsof` after cleanup and continue once the ports are free. Record which PIDs and cwd/commands were canceled. Hard stop only when a listener cannot be identified as a local emulator/test/dev process, cannot be terminated, or still blocks the required ship check after cleanup.

Hard stop if any selected local check fails after the port takeover/retry path. If a local E2E lane leaves emulator ports occupied and a following rules test fails to start because the Firestore emulator port is taken, confirm the stale listener with `lsof`, clean up the stale emulator process, and rerun the rules suite once before treating it as a product failure.

Record the root dependency alignment result, diff categories, Functions vendor integrity preflight result, commands selected, commands deliberately skipped, and why the selected gate is sufficient. If no extra local command is warranted beyond dependency alignment, the mandatory vendor preflight, and the release workflow's mandatory `npm run release:verify`, say that explicitly.

## GitHub CI Policy

`ship` is a local-verification workflow. Do not use GitHub Actions, PR status checks, or remote CI to decide readiness.

Rules:

- Do not call `gh pr checks`, `gh run watch`, `gh run view`, or similar commands for CI status during a ship run.
- Do not wait for, rerun, or troubleshoot GitHub Actions jobs as part of ship.
- Do not treat a GitHub CI failure as a ship blocker unless the same issue is reproduced by the local commands selected by this workflow or by the nested release/deploy/staging workflows.
- GitHub API use during ship is limited to required PR/merge mechanics plus publishing and verifying the matching GitHub Release. GitHub Release state is release metadata, not readiness evidence. Base readiness on local verification (`npm run release:verify`, targeted local checks, staging deploy, and staging validation), not on PR checks.
- If GitHub branch protection requires remote checks before a merge can complete, hard stop and report that policy constraint. Do not work around it by watching or rerunning CI.

## Phase 3.5: Staging Capability Preflight

Before invoking release or changing package version/tag state, run:

```bash
npm run ship:preflight:staging -- --run-id "$SHIP_RUN_ID"
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" \
  --run-id "$SHIP_RUN_ID" \
  --phase staging_capability_preflight \
  --status passed \
  --command "npm run ship:preflight:staging -- --run-id $SHIP_RUN_ID" \
  --reports ".firebase/ship-runs/$SHIP_RUN_ID/reports/staging-preflight.json"
```

This gate loads ignored staging env files without logging their values,
requires the fixed mirrored E2E account, confirms Auth plus the stable
Firestore baseline through ADC, requires separate Admin credentials, and
resolves that account through the read-only Admin Auth adapter before matching
its email against the canonical Admin-write allowlist. It never invokes a
mutation-capable product callable. Passwords, tokens, and API keys must never
enter logs, reports, or checkpoint details. Admin browser verification
classifies console/page-error text only in memory, then persists the fixed
`[REDACTED_DIAGNOSTIC]` placeholder instead of any browser-provided text.
Stored response URLs omit userinfo, query strings, and fragments; an
unparseable URL becomes `[REDACTED_URL]`.

Also record the completed scope-aware gate as `scope_aware_gate`, including
only command names and report paths. A failed preflight or scope gate is a
hard stop before release mutation.

## Phase 4: Prepare The Patch-Tagged Staging Candidate

Before invoking the release workflow's ship-only staging-first preparation
path, capture the base used for the later staging Functions diff-aware deploy:

```bash
SHIP_FUNCTIONS_DIFF_BASE="$(git rev-parse origin/main)"
RECORDED_RELEASE_SHA="$(node -e '
  const fs = require("fs")
  process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).releaseSha)
' "$SHIP_STATE")"
RELEASE_SOURCE_HEAD="$(git rev-parse HEAD)"
npm run ship:checkpoint -- identity \
  --repo-root "$PWD" \
  --run-id "$SHIP_RUN_ID" \
  --expected-current-release-sha "$RECORDED_RELEASE_SHA" \
  --release-sha "$RELEASE_SOURCE_HEAD" \
  --source-sha "$RELEASE_SOURCE_HEAD" \
  --functions-diff-base "$SHIP_FUNCTIONS_DIFF_BASE"
```

Record this value in the ship notes. Capture it after the final `origin/main`
sync and prep commits, but before the patch bump advances `release-branch`, so
the staging deploy can compare the released checkout against the pre-candidate
baseline.

Run the canonical release workflow's staging-first candidate preparation with
bump type `patch`.

Required behavior from `.agents/workflows/release.md`:

- keep the release source as the exact `release-branch` tip after prep commits
- run `npm run release:verify` on the source branch
- run `npm version patch --no-git-tag-version`
- run `npm run release:verify` on the exact bumped candidate
- commit and push the version bump to `release-branch`
- create and push annotated tag `v<version>`
- leave `release-branch` checked out at that exact tag with a clean scoped
  worktree
- do not check out, merge, or push `main` in this phase
- do not publish the GitHub Release in this phase

The canonical command sequence is:

```bash
test "$(git rev-parse --abbrev-ref HEAD)" = release-branch
RELEASE_SOURCE_HEAD="$(git rev-parse HEAD)"
npm run release:verify
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" --run-id "$SHIP_RUN_ID" \
  --phase release_verify_source --status passed \
  --command "npm run release:verify"

NEXT_VERSION="$(node -e '
  const semver = require("semver")
  const current = require("./package.json").version
  process.stdout.write(semver.inc(current, "patch"))
')"
TAG="v${NEXT_VERSION}"
git rev-parse "${TAG}" >/dev/null 2>&1 && {
  echo "tag ${TAG} already exists locally"
  exit 1
}
git ls-remote --exit-code --tags origin "${TAG}" >/dev/null 2>&1 && {
  echo "tag ${TAG} already exists on origin"
  exit 1
}

npm version patch --no-git-tag-version
test "$(node -p "require('./package.json').version")" = "$NEXT_VERSION"
npm run release:verify
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" --run-id "$SHIP_RUN_ID" \
  --phase release_verify_bumped --status passed \
  --command "npm run release:verify"

git add package.json package-lock.json
git commit -m "chore: release patch version prep"
git push origin release-branch
RELEASE_COMMIT="$(git rev-parse HEAD)"
git tag -a "${TAG}" -m "${TAG}"
git push origin "${TAG}"

npm run ship:checkpoint -- identity \
  --repo-root "$PWD" \
  --run-id "$SHIP_RUN_ID" \
  --expected-current-release-sha "$RELEASE_SOURCE_HEAD" \
  --release-sha "$RELEASE_COMMIT" \
  --release-tag "$TAG" \
  --source-sha "$RELEASE_SOURCE_HEAD" \
  --functions-diff-base "$SHIP_FUNCTIONS_DIFF_BASE"
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" --run-id "$SHIP_RUN_ID" \
  --phase patch_tag --status passed \
  --command "staging-first patch candidate and annotated tag $TAG"
```

Do not substitute a `minor` or `major` bump inside this skill. If the source
gate fails, do not mutate version/tag state. If the bumped-candidate gate
fails, fix the candidate on `release-branch`, rerun the full gate, amend or
create the appropriate focused commit, and create the tag only after the exact
candidate is green.

## Phase 4.5: Verify The Tagged Candidate

Resolve the expected tag from `package.json` and require the local annotated
tag, pushed remote tag, and checked-out `release-branch` commit to agree:

```bash
VERSION="$(node -p "require('./package.json').version")"
TAG="v${VERSION}"
RELEASE_COMMIT="$(git rev-parse HEAD)"
LOCAL_TAG_COMMIT="$(git rev-list -n 1 "${TAG}")"
REMOTE_TAG_COMMIT="$(git ls-remote origin "refs/tags/${TAG}^{}" | awk '{print $1}')"

test "$(git rev-parse --abbrev-ref HEAD)" = release-branch
test "$(git describe --tags --exact-match HEAD)" = "${TAG}"
test "${LOCAL_TAG_COMMIT}" = "${RELEASE_COMMIT}"
test -n "${REMOTE_TAG_COMMIT}"
test "${REMOTE_TAG_COMMIT}" = "${RELEASE_COMMIT}"
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" \
  --run-id "$SHIP_RUN_ID" \
  --phase patch_tag \
  --status passed \
  --command "verified staging candidate annotated tag $TAG"
```

The peeled `^{}` remote ref is required because this workflow creates annotated tags. An
unpeeled tag-object SHA is not the release commit and must not be compared
directly with `HEAD`.

Do not create, edit, or mark a GitHub Release as Latest here. The tag is a
staging candidate until every staging surface, targeted validation, roadmap,
Admin verification, and the post-staging `main` promotion gate pass.

## Phase 4.75: Firestore Index Predeploy Gate

Before Functions or Hosting can expose the release, inspect
`"${SHIP_FUNCTIONS_DIFF_BASE}...HEAD"` for `firestore.indexes.json` changes and
new or changed Firestore query shapes. When no new index can be required,
record the phase as skipped with that exact reason:

```bash
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" \
  --run-id "$SHIP_RUN_ID" \
  --phase index_preflight \
  --status skipped \
  --command "index predeploy gate not applicable"
```

When the diff is index-dependent, follow the canonical deploy workflow's
Firestore Index Predeploy Gate: deploy only `firestore:indexes` to staging,
wait until every relevant Firestore operation is complete, and only then
record the phase as passed:

```bash
INDEX_RUN_ID="${SHIP_RUN_ID}-index-predeploy"
INDEX_STATE=".firebase/ship-runs/${INDEX_RUN_ID}/state.json"
INDEX_ACTION="$(
  node scripts/plan-index-predeploy-resume.mjs plan \
    --state "$INDEX_STATE" --format action
)"
case "$INDEX_ACTION" in
  initial_deploy)
    bash scripts/deploy-firebase.sh staging firestore-indexes \
      --run-id "$INDEX_RUN_ID"
    ;;
  resume_deploy)
    bash scripts/deploy-firebase.sh staging firestore-indexes \
      --run-id "$INDEX_RUN_ID" --resume
    ;;
  recheck_only|recheck_and_finalize)
    echo "Index sub-run already finalized; skipping Firebase deploy."
    ;;
  *)
    echo "Unsupported index predeploy action: $INDEX_ACTION"
    exit 1
    ;;
esac
gcloud firestore operations list --project perkly-staging-7dab8
if test "$INDEX_ACTION" = initial_deploy || test "$INDEX_ACTION" = resume_deploy; then
  npm run ship:checkpoint -- phase \
    --repo-root "$PWD" --run-id "$INDEX_RUN_ID" \
    --phase cleanup --status passed --command "index predeploy cleanup"
fi
if test "$INDEX_ACTION" != recheck_only; then
  npm run ship:checkpoint -- finalize \
    --repo-root "$PWD" --run-id "$INDEX_RUN_ID" --status passed \
    --required-phases "firebase_deploy,cleanup"
fi
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" \
  --run-id "$SHIP_RUN_ID" \
  --phase index_preflight \
  --status passed \
  --command "frozen firestore:indexes deploy plus operation wait"
```

Do not start the staged Functions deploy while a required `CREATE_INDEX` or
`UPDATE_FIELD` operation is incomplete. A failed or ambiguous index gate is a
hard stop; retain the index sub-run checkpoint and frozen inputs until the
operation completes, then finalize that sub-run before recording the parent
gate as passed. On resume, use the planner above: pass `--resume` only to an
active sub-run, never re-enter deploy for a finalized-passed sub-run, and always
recheck operation completion before recording or re-recording the parent gate.
An index phase is evidence, not permission to assume a remote operation stayed
healthy.

## Phase 5: Deploy Released Build To Staging

After staging-first candidate preparation, confirm `release-branch` remains
checked out at the exact patch tag and the scoped worktree is clean. `main`
must still be untouched by this run:

```bash
git status --porcelain -- . ':(exclude).claude/worktrees/**'
test "$(git rev-parse --abbrev-ref HEAD)" = release-branch
test "$(git describe --tags --exact-match HEAD)" = "${TAG}"
test "$(git rev-parse HEAD)" = "${RELEASE_COMMIT}"
```

Run the full staging deploy from `.agents/workflows/deploy.md`. Select resume
mode when the checkpoint contains deploy evidence or a complete frozen
directory was atomically published immediately before its checkpoint write:

```bash
SHIP_DEPLOY_ARGS=(--run-id "$SHIP_RUN_ID")
SHIP_DEPLOY_RESUME="$(
  node -e '
    const fs = require("fs")
    const path = require("path")
    const state = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
    const runDir = path.dirname(process.argv[1])
    const deployInputsDir = path.join(runDir, "deploy-inputs")
    const hasPublishedDeployInputs = (
      fs.existsSync(deployInputsDir)
      && fs.readdirSync(deployInputsDir).some(
        (entry) => fs.existsSync(path.join(deployInputsDir, entry, "manifest.json")),
      )
    )
    const hasPublishedArtifact = ["web", "admin"].some(
      (surface) => fs.existsSync(
        path.join(runDir, "artifacts", surface, "manifest.json"),
      ),
    )
    const hasDeployEvidence = (
      Object.keys(state.artifacts ?? {}).length > 0
      || Object.keys(state.deployInputs ?? {}).length > 0
      || Object.values(state.phases ?? {}).some(
        (phase) => phase?.details?.deployBinding != null,
      )
      || hasPublishedDeployInputs
      || hasPublishedArtifact
    )
    process.stdout.write(hasDeployEvidence ? "true" : "false")
  ' "$SHIP_STATE"
)"
if test "$SHIP_DEPLOY_RESUME" = true; then
  SHIP_DEPLOY_ARGS+=(--resume)
fi
FUNCTIONS_DIFF_BASE="${SHIP_FUNCTIONS_DIFF_BASE}" \
  npm run deploy:staging -- "${SHIP_DEPLOY_ARGS[@]}"
```

Never retry without `--resume` after the checkpoint records deploy evidence or
an atomic frozen-directory publish has occurred.
Resume must reuse the original run ID, scope, Functions diff base, frozen
artifacts, and frozen deploy inputs.

After the deploy command completes, require the generated local marker and the
live staging marker to expose the same explicit tag. The live resolver fails
closed when `releaseTag` is absent, so it cannot silently accept a tag derived
from `appVersion`:

```bash
EXPECTED_RELEASE_TAG="${TAG}" SHIP_RUN_ID="$SHIP_RUN_ID" node --input-type=module -e "
  import { readSwBuildMetaFile } from './scripts/lib/sw-build-meta.mjs'
  const metadata = readSwBuildMetaFile(
    \`.firebase/ship-runs/\${process.env.SHIP_RUN_ID}/artifacts/web/public/sw-build-meta.js\`,
  )
  if (metadata.releaseTag !== process.env.EXPECTED_RELEASE_TAG) {
    throw new Error(\`local releaseTag mismatch: expected \${process.env.EXPECTED_RELEASE_TAG}, received \${metadata.releaseTag ?? 'missing'}\`)
  }
"

LIVE_STAGING_TAG="$(node scripts/resolve-staging-release-ref.mjs --format tag)"
test "${LIVE_STAGING_TAG}" = "${TAG}"
```

Do not accept `appVersion` equality as a substitute. A missing explicit
`releaseTag` means the build was not produced from the exact tagged commit and
the ship is incomplete.

This remains a full staging deploy for Hosting, Firestore rules/indexes, and Storage. `FUNCTIONS_DIFF_BASE` only lets the deploy script narrow the Functions resource list when confidence is high or medium; low-confidence backend/runtime diffs still deploy full `functions`, and no-Functions-impact diffs remove Functions from the staging deploy.

Before Firebase CLI deploy analysis begins, the canonical deploy workflow
generates the Functions manifest and checks every non-secret param against
`functions/.env.perkly-staging-7dab8`. It may add `false` only for an
explicitly allowlisted deploy-safety boolean whose manifest default is also
`false`, then report that ignored local-file update. It must preserve explicit
values and hard stop on unknown missing params, secrets/config requirements,
duplicates, invalid values, or anything that would require choosing `true`.

Do not run production deploy commands. Do not deploy card-asset hosting unless card assets changed and the user explicitly requested card assets.

## Phase 6: Staging Validation

Treat the strict `staging-qa` run triggered by `npm run deploy:staging` as the default post-deploy gate for full staging deploys. Rerun it manually only when you need a fresh rerun or are debugging a post-deploy issue:

```bash
npm run staging:qa
```

Then decide whether additional staging-test skills are required from the released diff:

- Run `staging-user-journey-verification` when the release changes auth, dashboard, wallet/cards, tracker UI, settings, routing, user-visible flows, or staging-safe write behavior.
- Run
  `npm run staging:verify:tracker -- --run-id "$SHIP_RUN_ID"` when the release
  changes benefit cadence logic, `userCards` creation/deletion semantics,
  `userCardBenefitsTracking`, deterministic tracking IDs, or Firestore
  triggers that derive tracker rows.
- Run `npm run staging:qa:deep` when functions, triggers, data model, or cross-collection consistency changed but a full tracker deep dive is not necessary.

Use the lightest targeted mode that proves the shipped behavior. Clean up all temporary staging records before finishing.

Record strict, deep/journey, and tracker evidence under the distinct
`strict_qa`, `deep_qa`, and `tracker_qa` checkpoint phases. Mark a
non-applicable targeted phase `skipped` with a reason; never leave it
implicitly absent.

After the deploy body and callable smoke pass, a strict QA failure may use one
narrow Playwright transient retry only when artifacts prove a page
load/navigation/loading timeout with no 5xx, page error, unknown console
error, product assertion after interaction, permission/rules failure,
decode/data-contract failure, cleanup failure, credential/config issue, or
fixed-account drift. Rerun only the failed test once with trace, then rerun the
full strict gate once with the same expected frozen build ID. Any repeated
failure or marker mismatch hard stops.

## Phase 7: Publish Latest Dev Roadmap To Staging

After the main staging deploy and required staging validation are clean, publish
the latest validated roadmap snapshot from the exact fetched `origin/dev` SHA.
The publisher intentionally rejects `release-branch`, `main`, feature branches,
dirty runtime inputs, and arbitrary SHAs, so run it from a clean temporary
detached worktree:

```bash
git fetch origin dev
ROADMAP_DEV_SHA="$(git rev-parse origin/dev)"
ROADMAP_PUBLISH_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/perks-roadmap-publish.XXXXXX")"
ROADMAP_PUBLISH_WORKTREE="${ROADMAP_PUBLISH_ROOT}/worktree"
git worktree add --detach "$ROADMAP_PUBLISH_WORKTREE" "$ROADMAP_DEV_SHA"
git -C "$ROADMAP_PUBLISH_WORKTREE" diff --quiet
test "$(git -C "$ROADMAP_PUBLISH_WORKTREE" rev-parse HEAD)" = "$ROADMAP_DEV_SHA"
npm --prefix "$ROADMAP_PUBLISH_WORKTREE" ci --prefer-offline
npm --prefix "$ROADMAP_PUBLISH_WORKTREE/functions" ci --prefer-offline
npm --prefix "$ROADMAP_PUBLISH_WORKTREE" run roadmap:publish:staging -- --sha "$ROADMAP_DEV_SHA"
git -C "$ROADMAP_PUBLISH_WORKTREE" status --porcelain
git worktree remove "$ROADMAP_PUBLISH_WORKTREE"
rmdir "$ROADMAP_PUBLISH_ROOT"
git worktree prune
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" \
  --run-id "$SHIP_RUN_ID" \
  --phase roadmap_publish \
  --status passed \
  --command "npm run roadmap:publish:staging -- --sha $ROADMAP_DEV_SHA"
```

Rules:

- Record `ROADMAP_DEV_SHA` and use that exact value for publication and hosted verification.
- The command is a staging-only repair/publication path. Never substitute `roadmap:publish:prod` or `roadmap:publish:all` during `ship`.
- Treat the publisher's strict GitHub-backed roadmap check, export/schema/size validation, and atomic Firestore success write as one required gate.
- If dependency installation or publication fails, stop before admin Hosting deploy. Preserve the temporary worktree only when needed for diagnosis; otherwise remove it once it is clean.
- Before removal, require an empty `git status --porcelain`. If the temporary worktree is dirty or removal fails, hard stop and report its exact path.

## Phase 8: Deploy Staging Admin Hosting

After the main staging deploy, required staging validation, and roadmap
publication are clean, deploy the matching admin build to the separate staging
admin Hosting site:

```bash
npm run deploy:staging:admin -- --run-id "$SHIP_RUN_ID"
```

This first Admin invocation intentionally omits `--resume`: the shared run
already has Web evidence, but Admin must create its own frozen artifact and
`admin_deploy` phase. The surface-aware deploy-entry guard permits that exact
Web-to-Admin transition only when `backend_deploy`, `web_deploy`,
`staging_web_marker`, `strict_qa`, `deep_qa`, `tracker_qa`, and
`roadmap_publish` are all `passed` or explicitly `skipped`; any missing,
failed, running, or pending prerequisite hard stops. A separate standalone
Admin run remains allowed when the checkpoint has no Web transition evidence.
The guard also rejects duplicate evidence for the current surface. Admin is
intentionally last because it does not auto-run strict
`staging-qa`. If this command fails, hard stop and report the Admin deploy
blocker instead of treating the ship as complete.

After patch/tag, full staging deploy, and required validation have passed, this
Admin-only command may be retried once only for clear 429/5xx/network/Hosting
version-creation transients after its build/prechecks passed. Wait briefly and
run:

```bash
npm run deploy:staging:admin -- --run-id "$SHIP_RUN_ID" --resume
```

The retry must verify and reuse the frozen Admin artifact. Do not apply this
exception to missing credentials/config, 403/404, billing prompts, marker
mismatch, build/precheck failure, product/runtime failure, or anything needing
infrastructure judgment.

The checkpoint records the Admin deploy attempt number. Attempt 1 is the
initial invocation; only attempt 2 may re-execute a failed Admin deploy body.
A failed attempt 2 consumes the exception and every later resume hard stops.

## Phase 9: Verify Hosted Staging Roadmap

Run the standard dedicated-credential verifier:

```bash
npm run staging:verify:admin -- \
  --run-id "$SHIP_RUN_ID" \
  --expected-roadmap-sha "$ROADMAP_DEV_SHA"
```

It requires the hosted no-store `admin-build-meta.json` to match this run's
frozen Admin manifest, opens `/admin/roadmap`, and verifies the complete
`ROADMAP_DEV_SHA` against staging Firestore. Known App Check/reCAPTCHA noise
may be ignored; page errors, unknown console errors, 403/404/5xx,
Firestore/permission errors, and SHA mismatch hard stop.

## Phase 10: Promote The Exact Staged Candidate To Main

Run this phase only after `backend_deploy`, `web_deploy`,
`staging_web_marker`, `strict_qa`, every applicable targeted QA phase,
`roadmap_publish`, `admin_deploy`, `staging_admin_marker`, and
`admin_verification` are passed or explicitly skipped. A staging failure must
never advance `main`.

Keep the ship workspace on `release-branch` at `${RELEASE_COMMIT}` /
`${TAG}`. Repository policy reserves `main` and `dev` for the primary
worktree, so resolve and use that worktree instead of switching the ship
workspace or creating a detached substitute:

```bash
SHIP_WORKTREE="$PWD"
PRIMARY_WORKTREE="$(
  dirname "$(git rev-parse --path-format=absolute --git-common-dir)"
)"
test -d "${PRIMARY_WORKTREE}/.git"
test "$(git -C "$SHIP_WORKTREE" rev-parse --abbrev-ref HEAD)" = release-branch
test "$(git -C "$SHIP_WORKTREE" rev-parse HEAD)" = "$RELEASE_COMMIT"
test "$(git -C "$SHIP_WORKTREE" describe --tags --exact-match HEAD)" = "$TAG"
```

Before switching the primary worktree, inspect its branch, scoped tracked and
untracked changes, active repo commands, and existing stashes. Wait for any
active test/build/deploy/agent command that owns the worktree to finish.
Classify dirty files using the same secret/ambiguity rules as Phase 1. A
reviewed non-secret WIP set may be protected in one uniquely named stash;
record its starting branch and exact stash identity. Never discard, overwrite,
or mix that WIP into the release. If the state is ambiguous or cannot be
restored safely, leave the already validated staging checkpoint open and
report `main` promotion pending.

Once the primary worktree is safely available:

```bash
PRIMARY_START_BRANCH="$(git -C "$PRIMARY_WORKTREE" rev-parse --abbrev-ref HEAD)"
git -C "$PRIMARY_WORKTREE" fetch origin main --tags
git -C "$PRIMARY_WORKTREE" switch main
git -C "$PRIMARY_WORKTREE" pull --ff-only origin main
git -C "$PRIMARY_WORKTREE" merge --no-edit "$TAG"
git -C "$PRIMARY_WORKTREE" merge-base --is-ancestor \
  "$RELEASE_COMMIT" HEAD
git -C "$PRIMARY_WORKTREE" status --porcelain -- \
  . ':(exclude).claude/worktrees/**'
```

The merge may fast-forward or create a normal merge commit when remote `main`
advanced during staging. It must never squash, cherry-pick, rebase, or recreate
the staged candidate. The annotated tag must continue to peel to
`${RELEASE_COMMIT}` and that commit must be an ancestor of the resulting
`main`. Merge conflicts, a changed tag, or a non-ancestor result hard stop
promotion; they do not erase the successful staging evidence.

Run the third full release gate on the resulting `main` tree, then push:

```bash
npm --prefix "$PRIMARY_WORKTREE" run release:verify
git -C "$PRIMARY_WORKTREE" push origin main
MAIN_PROMOTION_COMMIT="$(git -C "$PRIMARY_WORKTREE" rev-parse HEAD)"
git -C "$PRIMARY_WORKTREE" merge-base --is-ancestor \
  "$RELEASE_COMMIT" origin/main
npm run ship:checkpoint -- phase \
  --repo-root "$SHIP_WORKTREE" --run-id "$SHIP_RUN_ID" \
  --phase release_verify_main --status passed \
  --command "npm run release:verify on promoted main"
npm run ship:checkpoint -- phase \
  --repo-root "$SHIP_WORKTREE" --run-id "$SHIP_RUN_ID" \
  --phase main_promotion --status passed \
  --command "merge exact staged tag $TAG into main and push"
```

After the push, restore the primary worktree to its recorded starting branch
and reapply any exact named WIP stash. Verify the restored status against the
pre-promotion inventory before dropping that stash. Restoration failure is a
cleanup blocker and must be reported; do not silently leave another task on
the wrong branch. The ship workspace remains on `release-branch` at the staged
tag. Do not merge post-staging `main` back into `release-branch`; the next ship
will perform the normal remote-main pre-sync, while this checkpoint and its
artifact identity remain bound to the exact staged tag.

## Phase 10.5: Publish And Verify The GitHub Release

Only after `main_promotion` and `release_verify_main` pass, publish the staged
tag as a normal GitHub Release and explicitly make it Latest. This step is
idempotent so a ship can resume after the `main` push:

```bash
if gh release view "${TAG}" >/dev/null 2>&1; then
  gh release edit "${TAG}" \
    --verify-tag \
    --draft=false \
    --prerelease=false \
    --latest \
    --title "${TAG}"
else
  gh release create "${TAG}" \
    --verify-tag \
    --generate-notes \
    --latest \
    --title "${TAG}"
fi

test "$(gh release view "${TAG}" --json tagName --jq '.tagName')" = "${TAG}"
test "$(gh release view "${TAG}" --json isDraft --jq '.isDraft')" = false
test "$(gh release view "${TAG}" --json isPrerelease --jq '.isPrerelease')" = false
RELEASE_URL="$(gh release view "${TAG}" --json url --jq '.url')"
test -n "${RELEASE_URL}"
LATEST_TAG="$(gh release view --json tagName --jq '.tagName')"
test "${LATEST_TAG}" = "${TAG}"

npm run ship:checkpoint -- phase \
  --repo-root "$PWD" \
  --run-id "$SHIP_RUN_ID" \
  --phase github_release \
  --status passed \
  --command "post-staging gh release publish and verify $TAG" \
  --reports "$RELEASE_URL"
```

Hard stop final ship completion if GitHub authentication or permissions
prevent publishing, if the release is still draft/prerelease, if its tag
differs from `${TAG}`, or if GitHub resolves another release as Latest. Do not
let `gh release create` create a missing tag implicitly: `--verify-tag` is
mandatory. This failure does not invalidate the completed staging deployment
or successful `main` promotion; retain the checkpoint and resume only this
metadata phase.

## Phase 10.75: Reconcile Ship Support Fixes To Dev

After the GitHub Release is published and verified, reconcile only the
non-release support commits created after
`SHIP_DEV_RECONCILIATION_BASE_SHA`. This phase must not merge `main`,
`release-branch`, the annotated tag, or the version-prep commit into `dev`.

Fetch the latest `dev` and generate the machine-readable plan:

```bash
git fetch origin dev
DEV_RECONCILIATION_REPORT="$(
  printf '%s/reports/dev-reconciliation-plan.json' \
    "$(dirname "$SHIP_STATE")"
)"
npm run ship:plan-dev-reconciliation -- \
  --repo-root "$PWD" \
  --baseline "$SHIP_DEV_RECONCILIATION_BASE_SHA" \
  --release "$RELEASE_COMMIT" \
  --dev-ref origin/dev \
  --report "$DEV_RECONCILIATION_REPORT"
DEV_RECONCILIATION_ACTION="$(node -e '
  const fs = require("fs")
  process.stdout.write(
    JSON.parse(fs.readFileSync(process.argv[1], "utf8")).action,
  )
' "$DEV_RECONCILIATION_REPORT")"
```

Planner rules:

- Exact `chore: release patch version prep` commits touching only
  `package.json` / `package-lock.json` are release-only and excluded.
- Patch-equivalent or ancestor commits already present on the latest
  `origin/dev` are recorded and skipped.
- `.agents/**`, `.github/**`, docs, scripts, monitoring/maintenance tools,
  E2E, and test-only paths are eligible support changes.
- Runtime, product, rules, dependency/config, or otherwise unclassified paths
  return `hard_stop`. They require explicit product judgment and a separately
  scoped dev PR; never widen the automatic reconciliation allowlist during a
  ship.
- A version-prep subject carrying any non-version file is malformed and hard
  stops.

If the action is `skip`, record explicit evidence and continue:

```bash
if test "$DEV_RECONCILIATION_ACTION" = skip; then
  npm run ship:checkpoint -- phase \
    --repo-root "$PWD" --run-id "$SHIP_RUN_ID" \
    --phase dev_reconciliation --status skipped \
    --command "no unreconciled ship support commits" \
    --reports "$DEV_RECONCILIATION_REPORT"
fi
```

If the action is `hard_stop`, record the report as failed evidence and stop.
The staged release, `main` promotion, and GitHub Release remain valid, but the
ship checkpoint must stay resumable and must not finalize:

```bash
if test "$DEV_RECONCILIATION_ACTION" = hard_stop; then
  npm run ship:checkpoint -- phase \
    --repo-root "$PWD" --run-id "$SHIP_RUN_ID" \
    --phase dev_reconciliation --status failed \
    --command "dev reconciliation requires product judgment" \
    --reports "$DEV_RECONCILIATION_REPORT"
  exit 1
fi
```

For `create_pr`, create or resume one clean temporary worktree from the latest
`origin/dev`, then cherry-pick the planner's `candidateCommits` in report
order. Do not cherry-pick excluded or blocked commits:

```bash
DEV_RECONCILIATION_ROOT="$(
  mktemp -d "${TMPDIR:-/tmp}/perks-dev-reconciliation.XXXXXX"
)"
DEV_RECONCILIATION_WORKTREE="${DEV_RECONCILIATION_ROOT}/worktree"
DEV_RECONCILIATION_BRANCH="ship/dev-reconcile-${SHIP_RUN_ID}"
git worktree add -b "$DEV_RECONCILIATION_BRANCH" \
  "$DEV_RECONCILIATION_WORKTREE" origin/dev
node -e '
  const fs = require("fs")
  const plan = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
  for (const commit of plan.candidateCommits) console.log(commit.sha)
' "$DEV_RECONCILIATION_REPORT" |
while IFS= read -r DEV_RECONCILIATION_COMMIT; do
  git -C "$DEV_RECONCILIATION_WORKTREE" cherry-pick \
    "$DEV_RECONCILIATION_COMMIT"
done
git -C "$DEV_RECONCILIATION_WORKTREE" diff --check origin/dev...HEAD
```

Select and run the smallest local checks that prove the reconciled support
diff. At minimum run the planner and ship workflow contract tests when those
surfaces changed. Do not use GitHub Actions or PR checks as evidence. Push the
branch, create or reuse a PR with base `dev`, and follow the canonical
`pr-coding-loop` protocol. A valid exact-head `AGENT-REVIEW: GOOD_TO_GO`,
clean mergeability, no actionable findings, and no unresolved threads are
required before merging. Use a normal merge commit for this reconciliation PR
so each cherry-picked patch remains independently detectable:

```bash
git -C "$DEV_RECONCILIATION_WORKTREE" push -u origin \
  "$DEV_RECONCILIATION_BRANCH"
DEV_RECONCILIATION_PR_URL="$(
  gh pr list \
    --base dev \
    --head "$DEV_RECONCILIATION_BRANCH" \
    --state open \
    --json url \
    --jq '.[0].url // empty'
)"
if test -z "$DEV_RECONCILIATION_PR_URL"; then
  DEV_RECONCILIATION_PR_URL="$(
    gh pr create \
      --base dev \
      --head "$DEV_RECONCILIATION_BRANCH" \
      --title "chore: reconcile ship support fixes" \
      --body "Reconciles support-only commits from ship run ${SHIP_RUN_ID}."
  )"
fi
test -n "$DEV_RECONCILIATION_PR_URL"
# Follow pr-coding-loop, then:
gh pr merge <pr-number> --merge
```

On resume, reuse the existing branch/PR instead of creating a duplicate. If
the PR is awaiting review, record `dev_reconciliation=pending` with the PR URL
and stop cleanly. If `origin/dev` advanced, merge it into the reconciliation
branch without rewriting its commits, rerun affected local checks, push the
new head, and require a fresh exact-head approval.

After GitHub reports the PR merged, fetch `origin/dev` and rerun the planner
against the same immutable baseline and release commit. It must now return
`skip`, proving every candidate patch is represented on `dev`. Only then
remove the clean temporary worktree/branch, record the merged PR URL and both
plan reports, and mark the phase passed:

```bash
git fetch origin dev
DEV_RECONCILIATION_POST_REPORT="$(
  printf '%s/reports/dev-reconciliation-post-merge.json' \
    "$(dirname "$SHIP_STATE")"
)"
npm run ship:plan-dev-reconciliation -- \
  --repo-root "$PWD" \
  --baseline "$SHIP_DEV_RECONCILIATION_BASE_SHA" \
  --release "$RELEASE_COMMIT" \
  --dev-ref origin/dev \
  --report "$DEV_RECONCILIATION_POST_REPORT"
test "$(
  node -e '
    const fs = require("fs")
    process.stdout.write(
      JSON.parse(fs.readFileSync(process.argv[1], "utf8")).action,
    )
  ' "$DEV_RECONCILIATION_POST_REPORT"
)" = skip
git -C "$DEV_RECONCILIATION_WORKTREE" status --porcelain
git worktree remove "$DEV_RECONCILIATION_WORKTREE"
rmdir "$DEV_RECONCILIATION_ROOT"
git worktree prune
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" --run-id "$SHIP_RUN_ID" \
  --phase dev_reconciliation --status passed \
  --command "merged ship support reconciliation PR to dev" \
  --reports "$DEV_RECONCILIATION_REPORT,$DEV_RECONCILIATION_POST_REPORT,<pr-url>"
```

An unmerged PR, failed local check, cherry-pick conflict, non-empty worktree,
post-merge action other than `skip`, or cleanup failure blocks finalization.
Do not delete a diagnostic worktree that contains unresolved changes.

## Phase 11: Finalize And Compact

After every required phase passes, record `cleanup` and compact the run:

```bash
SHIP_REQUIRED_PHASES="$(
  printf '%s' \
    'worktree_sync,scope_aware_gate,staging_capability_preflight,' \
    'release_verify_source,release_verify_main,release_verify_bumped,' \
    'patch_tag,index_preflight,backend_deploy,web_deploy,' \
    'staging_web_marker,strict_qa,deep_qa,tracker_qa,roadmap_publish,' \
    'admin_deploy,staging_admin_marker,admin_verification,main_promotion,' \
    'github_release,dev_reconciliation,cleanup'
)"
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" --run-id "$SHIP_RUN_ID" \
  --phase cleanup --status passed --command "ship cleanup"
npm run ship:checkpoint -- finalize \
  --repo-root "$PWD" --run-id "$SHIP_RUN_ID" --status passed \
  --required-phases "$SHIP_REQUIRED_PHASES"
```

Finalization deletes large frozen Web/Admin artifacts, frozen deploy-input
trees, and cache backups but retains `state.json`, report files, and the report
index. Passed finalization first
requires every declared phase to exist as `passed` or explicitly `skipped`,
requires `cleanup=passed`, and rejects any recorded `failed`, `running`, or
`pending` phase. It then atomically records `finalStatus=passed` with
`cleanup.status=pending`, deletes those frozen directories idempotently, and
atomically records `cleanup.status=complete`. If cleanup is interrupted,
rerun the same finalize command; never rebuild or hand-edit the checkpoint.
Once `finalStatus` exists, the run is terminal: phase/artifact/identity
mutations and duplicate deploy entry are forbidden. The only allowed follow-up
is the same idempotent finalize operation when cleanup is pending (or a
read-only `show`).
Do not finalize failed runs; their artifacts and checkpoint must remain
available for safe resume.

## Reporting

Report:

- starting branch and confirmation that release execution switched to exact `release-branch`
- optional named remote branch pre-sync commit and merge result
- remote `main` pre-sync commit and merge result
- prep commits created, or why no prep commit was needed
- confirmation that the ship workspace stayed on `release-branch` and no
  `main` checkout or mutation occurred before staging
- root dependency alignment result, including any package-lock repair commit
- scope-aware local verification diff categories, i18n staging sync gate result/report path, commands run, skipped checks, and result
- confirmation that GitHub Actions / PR checks / remote CI were not used as ship gates
- Functions vendor integrity preflight result, including any lockfile/vendor refresh commit
- captured `SHIP_FUNCTIONS_DIFF_BASE` and the staging Functions diff-aware deploy confidence/result
- patch version and tag
- local and remote annotated-tag target commit plus exact-`HEAD` result
- release verification order and result: source candidate, bumped/tagged
  candidate, and post-staging promoted `main`
- staging deploy command/result
- local and live staging explicit `releaseTag` result
- staging validation skills and commands run
- staging roadmap publication command, exact `origin/dev` SHA, strict check result, Firestore write result, and temporary worktree cleanup
- staging admin Hosting deploy command/result
- hosted staging roadmap route and published-SHA verification
- primary-worktree starting branch/WIP preservation, exact staged tag/SHA
  promotion into `main`, pushed promotion commit, and restoration result
- GitHub Release URL, published/non-prerelease result, and Latest result after
  promotion
- dev reconciliation baseline, planner action/report, selected support
  commits, excluded release commits, PR URL/merge result, post-merge `skip`
  proof, and temporary worktree cleanup
- temporary staging records created and cleanup status
- final scoped worktree status
- blockers, skipped checks, and residual risk
