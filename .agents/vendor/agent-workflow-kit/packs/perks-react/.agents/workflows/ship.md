---
description: Optionally sync a named remote branch, sync the current branch from remote main, commit intended changes, cut a patch release, deploy staging, and run staging validation
---

# Ship Workflow

Use this workflow when the user wants the current branch shipped as a patch release and verified on Firebase staging.

If the task is really a production hotfix from a released tag, or only a narrow ordered cherry-pick should ship while current branch work stays out, use `.agents/workflows/hotfix.md` instead of adapting `ship`.

If the user invokes the skill with a branch name, for example `$ship dev6`, treat that name as an optional remote source branch. Fetch and merge `origin/dev6` into the currently checked out branch before the normal workflow starts. After that optional sync, the first normal workflow step remains syncing from remote `main`.

This workflow composes existing canonical workflows:

- `.agents/workflows/release.md` for current branch -> `main` -> current branch patch release
- `.agents/workflows/deploy.md` for Firebase staging deploy
- `.agents/workflows/staging-qa.md` for the default post-deploy staging gate
- `.agents/workflows/staging-user-journey-verification.md` for broader journey validation when needed
- `.agents/workflows/staging-tracker-verification.md` for tracker-specific deep validation when needed

## Scope

- Review and commit intended current-branch changes.
- Optionally sync a user-provided remote branch into the current branch before the remote `main` sync.
- Sync the current branch from remote `main` before final release-prep commits.
- Push the current branch.
- Run a `patch` release only.
- Deploy the released build to Firebase staging.
- Run the default staging QA gate.
- Run targeted staging verification when the released change warrants it.

Out of scope:

- Production deploys
- iOS or Android store uploads
- Minor or major releases
- Creating temporary release branches or worktrees unless the user explicitly asks

## Prerequisites

- Start on the branch that should be released.
- If a branch argument is provided, it names a remote branch to merge into the starting branch; it is not a request to check out that branch unless the user explicitly says so.
- The starting branch can accept a merge from `origin/<branch-argument>` when a branch argument is provided.
- The branch can accept a merge from `origin/main` before release prep is finalized.
- Node dependencies are installed at the repo root.
- Firebase CLI is authenticated for staging deploys.
- `.env.staging` points at `perkly-staging-7dab8` with `VITE_USE_EMULATORS=false`.
- `.env.staging.local` or the shell environment provides staging E2E credentials when staging tests need them.
- Application Default Credentials are available for Firebase Admin SDK staging checks.

## Hard Stops

Stop and report before continuing if any of these occur:

- An unrelated runtime/config change is present and the user has not confirmed it belongs in the ship.
- A secret, real env file, scratch artifact, or local-only file would be committed.
- A provided branch argument does not exist on `origin`.
- `origin/<branch-argument>` cannot be merged cleanly into the current branch.
- `origin/main` cannot be merged cleanly into the current branch.
- A separate worktree holding `main` has local changes or cannot be removed cleanly before the release step.
- `npm run release:verify` fails during the release workflow.
- The patch release tag cannot be created or pushed.
- `npm run deploy:staging` fails or reports unusual Firebase/environment errors.
- Staging QA or targeted staging verification fails.
- Temporary staging records cannot be cleaned up.

## Phase 0: Optional Sync From Named Remote Branch

Run this phase only when the user provides a branch argument after `ship`, such as `$ship dev6`.

Normalize the argument as a remote branch name:

- strip a leading `origin/` if the user included it
- do not treat the argument as a request to switch branches
- if the normalized branch is `main`, skip this phase and rely on Phase 1

Record the starting branch:

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
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

Merge the named remote branch into the current branch:

```bash
git merge --no-edit "origin/${SYNC_BRANCH}"
```

If conflicts occur, resolve them on the current branch, run the smallest relevant verification for the resolved files, and commit the merge/conflict resolution before continuing. If the conflicts are broad or ambiguous, stop and report the conflicted files.

After this phase succeeds, continue to Phase 1. Do not skip the remote `main` sync.

## Phase 1: Sync From Remote Main

The first release-risk check is whether the current branch can absorb the latest remote `main`. Do this before final release-prep commits and before invoking the release workflow so conflicts are found early.

Record the starting branch:

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
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

Merge remote `main` into the current branch:

```bash
git merge --no-edit origin/main
```

If conflicts occur, resolve them on the current branch, run the smallest relevant verification for the resolved files, and commit the merge/conflict resolution before continuing. If the conflicts are broad or ambiguous, stop and report the conflicted files.

## Phase 2: Commit Current Ship Changes

Commit only intended files. Prefer multiple focused commits if the dirty set has separable concerns; otherwise use one conventional commit:

```bash
git add <intended-files-only>
git commit -m "chore: prepare patch ship"
git push origin HEAD
```

If there are no intended dirty files, record that no prep commit was needed and continue from the existing branch tip.

Push the branch after the remote-main sync and prep commits:

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

## Phase 3: Patch Release

Run the canonical release workflow with bump type `patch`.

Required behavior from `.agents/workflows/release.md`:

- keep the release source as the exact current branch tip after prep commits
- run `npm run release:verify` on the source branch
- merge current branch into `main`
- verify the source commit is in `main` ancestry before version bump
- run `npm run release:verify` on `main`
- run `npm version patch --no-git-tag-version`
- run `npm run release:verify` on the bumped release commit
- commit and push the version bump
- create and push annotated tag `v<version>`
- merge `main` back into the original branch and push
- end with a clean scoped worktree

Do not substitute a `minor` or `major` bump inside this skill.

## Phase 4: Deploy Released Build To Staging

After the release workflow returns to the original branch with `main` merged back in, confirm the branch includes the release bump/tag lineage and the scoped worktree is clean:

```bash
git status --porcelain -- . ':(exclude).claude/worktrees/**'
node -p "require('./package.json').version"
```

Run the full staging deploy from `.agents/workflows/deploy.md`:

```bash
npm run deploy:staging
```

Do not run production deploy commands. Do not deploy card-asset hosting unless card assets changed and the user explicitly requested card assets.

## Phase 5: Staging Validation

Treat the strict `staging-qa` run triggered by `npm run deploy:staging` as the default post-deploy gate for full staging deploys. Rerun it manually only when you need a fresh rerun or are debugging a post-deploy issue:

```bash
npm run staging:qa
```

Then decide whether additional staging-test skills are required from the released diff:

- Run `staging-user-journey-verification` when the release changes auth, dashboard, wallet/cards, tracker UI, settings, routing, user-visible flows, or staging-safe write behavior.
- Run `staging-tracker-verification` when the release changes benefit cadence logic, `userCards` creation/deletion semantics, `userCardBenefitsTracking`, deterministic tracking IDs, or Firestore triggers that derive tracker rows.
- Run `npm run staging:qa:deep` when functions, triggers, data model, or cross-collection consistency changed but a full tracker deep dive is not necessary.

Use the lightest targeted mode that proves the shipped behavior. Clean up all temporary staging records before finishing.

## Reporting

Report:

- starting branch
- optional named remote branch pre-sync commit and merge result
- remote `main` pre-sync commit and merge result
- prep commits created, or why no prep commit was needed
- `main` worktree cleanup result before release
- patch version and tag
- release verification result
- branch sync result (`current -> main -> current`)
- staging deploy command/result
- staging validation skills and commands run
- temporary staging records created and cleanup status
- final scoped worktree status
- blockers, skipped checks, and residual risk
