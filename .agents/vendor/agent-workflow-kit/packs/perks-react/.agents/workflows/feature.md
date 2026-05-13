---
description: Create and complete a short-lived feature branch/worktree from the current branch tip with plan/design/finish gates, squash merge to main, and full cleanup
---

# Feature Workflow

Use this workflow when the user wants a feature to live in its own short-lived worktree and branch, move through `plan -> design -> finish`, merge into `main`, and leave no stale worktree behind.

## Scope

- Create a feature branch from the current checked-out branch tip
- Create a dedicated worktree for that branch
- Keep the feature branch gated by `plan`, `design`, and `finish`
- Merge `origin/main` into the feature branch before merge
- Run `re` and `verify` before opening or merging the PR
- Create or update a PR to `main`
- Squash-merge the PR
- Delete the local worktree, local branch, and remote branch after merge
- Return to the primary workspace with a clean worktree layout

## Non-Goals

- Do not bump versions, tag releases, deploy, or upload stores
- Do not rebase the feature branch by default
- Do not force-push
- Do not stash local changes automatically
- Do not resurrect or reuse stale feature worktrees

## Canonical Naming

Assume:

```bash
SOURCE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
SOURCE_HEAD=$(git rev-parse HEAD)
SOURCE_IS_DIRTY=$([ -n "$(git status --porcelain)" ] && echo "yes" || echo "no")
REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
SLUG="<user-provided-or-derived-slug>"
FEATURE_ID="feature-${SLUG}"
FEATURE_BRANCH="codex/${FEATURE_ID}"
FEATURE_ROOT="$HOME/.codex/worktrees/${FEATURE_ID}"
FEATURE_WORKTREE="${FEATURE_ROOT}/${REPO_NAME}"
PRIMARY_WORKTREE=$(git rev-parse --show-toplevel)
```

Rules:

- Derive the feature from the branch that is currently checked out when the workflow starts.
- Use `codex/feature-<slug>` as the branch name.
- Use `~/.codex/worktrees/feature-<slug>/<repo-name>` as the worktree path.
- Always branch the feature from `SOURCE_HEAD` (local branch tip), regardless of source worktree cleanliness. `git worktree add` creates an independent checkout and does not touch the source worktree's files.
- Record `SOURCE_BRANCH`, `SOURCE_HEAD`, and `SOURCE_IS_DIRTY` before creating the feature branch.
- If `SLUG` is missing, derive it from the task name and normalize to lowercase hyphen-case.

## Mixed Safety Mode

### Auto-Allowed

- `git fetch --prune`
- `git worktree prune`
- creating `FEATURE_ROOT`
- creating the feature worktree at `SOURCE_HEAD` in every case — clean, dirty, upstream present, or upstream absent; source worktree files are never touched
- running the optional source-branch `git pull --ff-only` only when the source worktree is clean AND the source branch has an upstream that can fast-forward; silently skip it otherwise
- post-merge deletion of the feature worktree, local branch, and remote branch

### Hard Stops

- `FEATURE_BRANCH` already exists locally or on `origin`
- `FEATURE_WORKTREE` already exists or is already registered in `git worktree list`
- an open PR already exists for `FEATURE_BRANCH`
- any merge or rebase conflict occurs
- `finish` is attempted before `plan` and `design` are settled
- `origin/main` has not been merged into the feature branch before merge
- `re` fails
- `verify` fails
- PR squash fails
- cleanup leaves a stale local worktree, local branch, or remote branch behind

## Pre-Flight Checks

Run from the source worktree before creating the feature branch:

```bash
git status --short
git fetch --prune
git worktree prune
git branch --show-current
git rev-parse HEAD
# Optional: resolve upstream; a non-zero exit here is not a failure — it just means no upstream.
git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true
git show-ref --verify --quiet "refs/heads/${FEATURE_BRANCH}"
git ls-remote --exit-code --heads origin "${FEATURE_BRANCH}"
git worktree list
gh pr list --head "${FEATURE_BRANCH}" --state open --json number,url
```

Pass conditions (must all hold):

- `SOURCE_HEAD = git rev-parse HEAD` resolves (the feature worktree always branches from local HEAD).
- `FEATURE_BRANCH` lookup fails locally.
- `FEATURE_BRANCH` lookup fails on `origin`.
- No existing worktree path matches `FEATURE_WORKTREE`.
- No open PR exists for the branch.

The optional source-branch pull is not a pass condition. It is a best-effort hygiene step:

- Run `git pull --ff-only` only when `git status --short` is empty AND `@{upstream}` resolves.
- Skip the pull silently otherwise (dirty worktree, no upstream, or upstream that cannot fast-forward). Skipping never blocks feature creation because the feature already branches from local `SOURCE_HEAD`.

If any pass condition fails, stop and report the exact blocker.

Regardless of cleanliness or upstream state, the feature branch starts from local `SOURCE_HEAD`, so unpushed local commits on the source branch are preserved and source-worktree files stay untouched.

### Dirty-Source Exclusion Warning

When `SOURCE_IS_DIRTY=yes`, the dirty files live only in the source worktree — they are NOT carried into the new feature worktree. Before creating the feature worktree, print a loud, unmissable warning:

```
⚠️  DIRTY-SOURCE-EXCLUSION
The source worktree (${SOURCE_BRANCH}) has uncommitted changes. These files
will NOT be part of the new feature worktree (${FEATURE_WORKTREE}).
They remain only in the source worktree. If any of these changes were meant
for this feature, cancel now, commit or move them, and retry.

Excluded paths:
$(git status --short)
```

Do not proceed past this warning silently. If the user does not cancel, continue with feature creation and repeat the same exclusion summary in the final report.

## Phase 1: Create and Plan

1. Create the feature worktree:
   ```bash
   mkdir -p "${FEATURE_ROOT}"
   git worktree add -b "${FEATURE_BRANCH}" "${FEATURE_WORKTREE}" "${SOURCE_HEAD}"
   ```
2. Move into the feature worktree:
   ```bash
   cd "${FEATURE_WORKTREE}"
   git status --short --branch
   ```
3. Record and report:
   - `SOURCE_BRANCH`
   - `SOURCE_HEAD`
   - `FEATURE_BRANCH`
   - `FEATURE_WORKTREE`
4. Produce the `plan` gate outcome:
   - goal
   - success criteria
   - scope boundaries
   - constraints and dependencies
5. Do not move into design or implementation until the plan is coherent and explicit.

## Phase 2: Design

Within the feature worktree:

1. Settle the implementation approach:
   - key interfaces and contracts
   - data flow
   - edge cases and failure modes
   - test coverage expectations
2. Confirm the design is decision-complete enough to implement.
3. Do not enter `finish` until the design is stable.

The workflow does not require a fixed markdown artifact for plan or design in v1. The gate is semantic, not file-based.

## Phase 3: Finish

Only run `finish` from the feature worktree after implementation is complete and the feature worktree is clean enough to review.

1. Confirm the current branch and scoped cleanliness:
   ```bash
   git branch --show-current
   git status --short
   ```
2. Refresh refs and absorb drift from `origin/main` by merge:
   ```bash
   git fetch --prune
   git merge --no-ff origin/main
   ```
3. Stop immediately on any merge conflict. Do not switch to rebase or force-push.
4. Run review before verification:
   - Load `.agents/skills/re/SKILL.md`
   - Run the repo's review flow for the current changes
5. Run full verification:
   - Load `.agents/skills/verify/SKILL.md`
   - Run the repo's canonical verify flow
6. If either step fails, stop. Do not open or merge the PR.
7. Create or update the PR to `main`:
   ```bash
   gh pr create --base main --head "${FEATURE_BRANCH}" --fill
   ```
   If a PR already exists for the branch because this is a rerun after creation, update/report that PR instead of opening a duplicate.
8. Squash-merge the PR:
   ```bash
   gh pr merge "${FEATURE_BRANCH}" --squash
   ```
9. Return to the primary workspace and clean up local state:
   ```bash
   cd "${PRIMARY_WORKTREE}"
   git worktree remove "${FEATURE_WORKTREE}"
   git branch -d "${FEATURE_BRANCH}"
   git push origin --delete "${FEATURE_BRANCH}"
   git worktree prune
   ```
10. Validate cleanup:
   ```bash
   git worktree list
   git show-ref --verify --quiet "refs/heads/${FEATURE_BRANCH}"
   git ls-remote --exit-code --heads origin "${FEATURE_BRANCH}"
   ```

Cleanup pass conditions:

- `FEATURE_WORKTREE` no longer appears in `git worktree list`
- local branch lookup fails
- remote branch lookup fails

If any cleanup pass condition fails, stop and report the residual state.

## Reporting

Always report:

- source branch and source commit (local HEAD)
- `SOURCE_IS_DIRTY` (yes/no); if yes, restate the `DIRTY-SOURCE-EXCLUSION` warning with the full list of dirty paths and the explicit note that they are NOT in the feature worktree
- whether the source branch has an upstream, and whether the optional `git pull --ff-only` ran or was skipped
- feature branch and worktree path
- current phase completed
- whether `origin/main` was merged into the feature branch before merge
- `re` status
- `verify` status
- PR URL and squash-merge status
- local worktree removal status
- local branch deletion status
- remote branch deletion status
- final `git worktree list` health summary
