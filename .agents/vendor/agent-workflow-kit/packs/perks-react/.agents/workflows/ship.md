---
description: Ship through the fixed release-branch branch by optionally syncing a named remote branch, syncing remote main, cutting a patch release, deploying staging, running staging validation, and deploying staging admin Hosting
---

# Ship Workflow

Use this workflow when the user wants the exact `release-branch` branch shipped as a patch release, verified on Firebase staging, and finished with the matching staging admin Hosting deployment.

If the task is really a production hotfix from a released tag, or only a narrow ordered cherry-pick should ship while current branch work stays out, use `.agents/workflows/hotfix.md` instead of adapting `ship`.

Every ship run uses the fixed branch named `release-branch` as the release source. If the user invokes the skill with a branch name, for example `$ship feature/my-branch`, treat that name as an optional remote source branch. Fetch and merge `origin/<branch>` into `release-branch` before the normal workflow starts. After that optional sync, the first normal workflow step remains syncing `release-branch` from remote `main`.

This workflow composes existing canonical workflows:

- `.agents/workflows/release.md` for `release-branch` -> `main` -> `release-branch` patch release
- `.agents/workflows/deploy.md` for Firebase staging deploy
- `.agents/workflows/staging-qa.md` for the default post-deploy staging gate
- `.agents/workflows/staging-user-journey-verification.md` for broader journey validation when needed
- `.agents/workflows/staging-tracker-verification.md` for tracker-specific deep validation when needed

## Scope

- Check out the exact local branch `release-branch` tracking `origin/release-branch`.
- Review and commit intended `release-branch` changes.
- Optionally sync a user-provided remote branch into `release-branch` before the remote `main` sync.
- Sync `release-branch` from remote `main` before final release-prep commits.
- Push `release-branch`.
- Align root dependencies and run a scope-aware local verification gate before the release workflow.
- Use local verification only. Do not use GitHub Actions, GitHub PR checks, or remote CI as a ship gate.
- Run a `patch` release only.
- Deploy the released build to Firebase staging.
- Run the default staging QA gate.
- Run targeted staging verification when the released change warrants it.
- Deploy the released admin build to staging admin Hosting as the final step.

Out of scope:

- Production deploys
- iOS or Android store uploads
- Minor or major releases
- Creating temporary release branches or worktrees unless the user explicitly asks. The fixed `release-branch` branch is not temporary and is required for this workflow.
- Watching, rerunning, waiting for, or relying on GitHub Actions / PR checks / remote CI. If verification is needed, run the equivalent local command and report that local evidence.

## Prerequisites

- `origin/release-branch` exists and can be checked out as local branch `release-branch`.
- Any starting branch is only the invocation context; it is not the release source.
- If a branch argument is provided, it names a remote branch to merge into `release-branch`; it is not a request to check out that branch.
- `release-branch` can accept a merge from `origin/<branch-argument>` when a branch argument is provided.
- `release-branch` can accept a merge from `origin/main` before release prep is finalized.
- Node dependencies can be installed at the repo root from `package-lock.json`.
- Firebase CLI is authenticated for staging deploys.
- `.env.staging` points at `perkly-staging-7dab8` with `VITE_USE_EMULATORS=false`.
- `.env.staging.local` or the shell environment provides staging E2E credentials when staging tests need them.
- Application Default Credentials are available for Firebase Admin SDK staging checks.

## Hard Stops

Stop and report before continuing if any of these occur:

- An unrelated runtime/config change is present and the user has not confirmed it belongs in the ship.
- A secret, real env file, scratch artifact, or local-only file would be committed.
- `origin/release-branch` is missing, cannot be fetched, or local state prevents checking out `release-branch` safely.
- A provided branch argument does not exist on `origin`.
- `origin/<branch-argument>` cannot be merged cleanly into `release-branch`.
- `origin/main` cannot be merged cleanly into `release-branch`.
- A separate worktree holding `main` has local changes or cannot be removed cleanly before the release step.
- Root dependency alignment fails, or `npm install` changes `package.json` / `package-lock.json` in a way that is not clearly an intentional lockfile alignment for the finalized release source.
- The scope-aware local verification gate fails before the release workflow.
- Ship-local emulator takeover fails: standard Firebase emulator or local E2E dev-server ports remain occupied after verified emulator/test/dev listeners are terminated and rechecked.
- The Functions vendor integrity preflight finds that `functions/vendor/*.tgz` does not match `functions/package-lock.json`, unless the mismatch is refreshed, verified, committed, and pushed before release.
- `npm run release:verify` fails during the release workflow and the failure cannot be fixed, verified, committed, pushed, and retried safely within the ship scope.
- The patch release tag cannot be created or pushed.
- Branch protection or repository settings require GitHub CI status checks before the release can merge. Report the policy blocker instead of waiting for, rerunning, or using remote CI.
- `npm run deploy:staging` fails or reports unusual Firebase/environment errors that cannot be fixed, verified, committed, pushed, and retried safely within the ship scope.
- Staging QA or targeted staging verification fails and the failure cannot be fixed, verified, committed, pushed, and retried safely within the ship scope.
- `npm run deploy:staging:admin` fails or reports unusual Firebase/environment errors that cannot be fixed, verified, committed, pushed, and retried safely within the ship scope.
- Temporary staging records cannot be cleaned up.

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

## Phase 2.5: Remove A Blocking `main` Worktree

Before invoking the release workflow, ensure no separate worktree is still holding `main`.

Inspect worktrees:

```bash
git worktree list
```

If another worktree has `main` checked out:

```bash
git -C <main-worktree-path> status --short --branch
git worktree remove <main-worktree-path>
git worktree prune
```

Rules:

- If the `main` worktree is clean, remove it so the release workflow can check out `main` in the current workspace without stopping.
- If the `main` worktree has tracked or untracked changes, stop and report the path plus status instead of deleting it.
- If the current workspace is itself on `main`, do not remove it.

## Phase 2.75: Align Root Dependencies

Run this after the finalized release source branch has been synced, prep commits have been pushed, and any blocking `main` worktree has been removed. Do it before choosing or running local verification commands.

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

Run this gate after the fixed release-branch checkout, optional named-branch sync, remote `main` sync, prep commits, branch push, `main` worktree cleanup, and root dependency alignment, but before invoking the release workflow. The gate should prove the finalized `release-branch` tip without turning every daily ship into a full local E2E run or duplicating the release workflow's mandatory `npm run release:verify` gate.

Always inspect the effective release diff before choosing targeted checks:

```bash
git diff --name-only origin/main...HEAD
```

The release workflow still owns the baseline local release gate: it will run `npm run release:verify` on the source branch before merging to `main`, then rerun it on `main` and on the final bumped release commit. This phase adds only the targeted local checks that are not already guaranteed by that baseline.

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

- Run `npm run test:rules` when the diff touches Firestore rules, rules tests, auth/admin role enforcement, write-boundary code, or any Firestore read/write permission behavior.
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
- If the release workflow uses GitHub for PR creation or merge mechanics, use it only for those mechanics. Base readiness on local verification (`npm run release:verify`, targeted local checks, staging deploy, and staging validation), not on PR checks.
- If GitHub branch protection requires remote checks before a merge can complete, hard stop and report that policy constraint. Do not work around it by watching or rerunning CI.

## Phase 4: Patch Release

Run the canonical release workflow with bump type `patch`.

Required behavior from `.agents/workflows/release.md`:

- keep the release source as the exact `release-branch` tip after prep commits
- run `npm run release:verify` on the source branch
- merge `release-branch` into `main`
- verify the source commit is in `main` ancestry before version bump
- use GitHub only for required PR/merge mechanics; do not wait for, inspect, rerun, or rely on GitHub Actions / PR checks
- when the PR is squash-merged and the ancestry check fails, follow `.agents/workflows/release.md`: prove the squashed `main` tree is identical to the release source, create the no-content `chore: preserve release source ancestry` merge commit, and rerun the ancestry check before continuing
- run `npm run release:verify` on `main`
- run `npm version patch --no-git-tag-version`
- run `npm run release:verify` on the bumped release commit
- commit and push the version bump
- create and push annotated tag `v<version>`
- merge `main` back into `release-branch` and push
- end with a clean scoped worktree

Do not substitute a `minor` or `major` bump inside this skill.

## Phase 5: Deploy Released Build To Staging

After the release workflow returns to `release-branch` with `main` merged back in, confirm the branch includes the release bump/tag lineage and the scoped worktree is clean:

```bash
git status --porcelain -- . ':(exclude).claude/worktrees/**'
node -p "require('./package.json').version"
```

Run the full staging deploy from `.agents/workflows/deploy.md`:

```bash
npm run deploy:staging
```

Do not run production deploy commands. Do not deploy card-asset hosting unless card assets changed and the user explicitly requested card assets.

## Phase 6: Staging Validation

Treat the strict `staging-qa` run triggered by `npm run deploy:staging` as the default post-deploy gate for full staging deploys. Rerun it manually only when you need a fresh rerun or are debugging a post-deploy issue:

```bash
npm run staging:qa
```

Then decide whether additional staging-test skills are required from the released diff:

- Run `staging-user-journey-verification` when the release changes auth, dashboard, wallet/cards, tracker UI, settings, routing, user-visible flows, or staging-safe write behavior.
- Run `staging-tracker-verification` when the release changes benefit cadence logic, `userCards` creation/deletion semantics, `userCardBenefitsTracking`, deterministic tracking IDs, or Firestore triggers that derive tracker rows.
- Run `npm run staging:qa:deep` when functions, triggers, data model, or cross-collection consistency changed but a full tracker deep dive is not necessary.

Use the lightest targeted mode that proves the shipped behavior. Clean up all temporary staging records before finishing.

## Phase 7: Deploy Staging Admin Hosting

After the main staging deploy and required staging validation are clean, deploy the matching admin build to the separate staging admin Hosting site:

```bash
npm run deploy:staging:admin
```

This is intentionally last because the admin scope is a separate Hosting deploy that does not auto-run strict `staging-qa`. If this command fails, hard stop and report the admin deploy blocker instead of treating the ship as complete.

## Reporting

Report:

- starting branch and confirmation that release execution switched to exact `release-branch`
- optional named remote branch pre-sync commit and merge result
- remote `main` pre-sync commit and merge result
- prep commits created, or why no prep commit was needed
- `main` worktree cleanup result before release
- root dependency alignment result, including any package-lock repair commit
- scope-aware local verification diff categories, commands run, skipped checks, and result
- confirmation that GitHub Actions / PR checks / remote CI were not used as ship gates
- Functions vendor integrity preflight result, including any lockfile/vendor refresh commit
- patch version and tag
- release verification result
- branch sync result (`release-branch -> main -> release-branch`)
- staging deploy command/result
- staging validation skills and commands run
- staging admin Hosting deploy command/result
- temporary staging records created and cleanup status
- final scoped worktree status
- blockers, skipped checks, and residual risk
