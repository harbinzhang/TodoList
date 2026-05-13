---
description: Create and complete a short-lived feature branch/worktree using repo-profile defaults
---

# Feature Workflow

Use this workflow when a feature should live in its own short-lived branch and worktree, move through `plan -> design -> finish`, then merge and clean up.

## Profile Inputs

Read `.agents/repo-profile.yaml` from the consumer repo. Defaults:

- `repo.defaultBranch`: `main`
- `repo.branchPrefix`: `codex/`
- `repo.worktreeRoot`: `~/.codex/worktrees`
- `commands.verify`: `npm run verify`

## Naming

```bash
SOURCE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
SOURCE_HEAD=$(git rev-parse HEAD)
SOURCE_IS_DIRTY=$([ -n "$(git status --porcelain)" ] && echo "yes" || echo "no")
REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
SLUG="<user-provided-or-derived-slug>"
FEATURE_ID="feature-${SLUG}"
FEATURE_BRANCH="${BRANCH_PREFIX}${FEATURE_ID}"
FEATURE_ROOT="${WORKTREE_ROOT}/${FEATURE_ID}"
FEATURE_WORKTREE="${FEATURE_ROOT}/${REPO_NAME}"
PRIMARY_WORKTREE=$(git rev-parse --show-toplevel)
```

Rules:

- Derive the feature from the current branch local `HEAD`.
- Normalize missing slugs to lowercase hyphen-case.
- Always create the feature worktree from `SOURCE_HEAD`, regardless of source worktree cleanliness.
- Do not carry uncommitted source-worktree files into the feature worktree.

## Pre-Flight

Run from the source worktree:

```bash
git status --short
git fetch --prune
git worktree prune
git branch --show-current
git rev-parse HEAD
git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true
git show-ref --verify --quiet "refs/heads/${FEATURE_BRANCH}"
git ls-remote --exit-code --heads origin "${FEATURE_BRANCH}"
git worktree list
gh pr list --head "${FEATURE_BRANCH}" --state open --json number,url
```

Hard stop if the feature branch, feature worktree, registered worktree, or open PR already exists.

Run the optional source-branch `git pull --ff-only` only when `git status --short` is empty and `@{upstream}` resolves. Skip it for dirty worktrees, missing upstreams, or upstreams that cannot fast-forward. Skipping this pull is not a hard stop because feature creation still branches from local `HEAD`.

If `SOURCE_IS_DIRTY=yes`, print this warning before creating the feature worktree:

```text
DIRTY-SOURCE-EXCLUSION
The source worktree (<SOURCE_BRANCH>) has uncommitted changes. These files
will NOT be part of the new feature worktree (<FEATURE_WORKTREE>).
They remain only in the source worktree. If any of these changes were meant
for this feature, cancel now, commit or move them, and retry.

Excluded paths:
<git status --short>
```

Do not proceed silently past this warning. If the user does not cancel, continue with feature creation and repeat the exclusion summary in the final report.

## Phase 1: Create and Plan

```bash
mkdir -p "${FEATURE_ROOT}"
git worktree add -b "${FEATURE_BRANCH}" "${FEATURE_WORKTREE}" "${SOURCE_HEAD}"
cd "${FEATURE_WORKTREE}"
git status --short --branch
```

Produce a plan with goal, success criteria, scope boundaries, constraints, and dependencies. Do not implement before the plan is coherent.

## Phase 2: Design

Settle interfaces, data flow, edge cases, failure modes, and test expectations. Do not enter finish until the design is decision-complete.

## Phase 3: Finish

Run from the feature worktree:

```bash
git branch --show-current
git status --short
git fetch --prune
git merge --no-ff "origin/${DEFAULT_BRANCH}"
```

Stop on conflicts. Do not switch to rebase or force-push unless the user explicitly asks for that different workflow.

Then run the repo's review and verification gates:

```bash
# Review: use repo-local re skill if present, otherwise vendored re skill.
${VERIFY_COMMAND}
```

Create or update the PR:

```bash
gh pr create --base "${DEFAULT_BRANCH}" --head "${FEATURE_BRANCH}" --fill
```

If a PR already exists, report/update it instead of creating a duplicate.

After a valid merge decision:

```bash
gh pr merge "${FEATURE_BRANCH}" --squash
cd "${PRIMARY_WORKTREE}"
git worktree remove "${FEATURE_WORKTREE}"
git branch -d "${FEATURE_BRANCH}"
git push origin --delete "${FEATURE_BRANCH}"
git worktree prune
```

Validate cleanup with `git worktree list`, local branch lookup, and remote branch lookup.

## Reporting

Always report:

- source branch and source commit
- `SOURCE_IS_DIRTY` and any `DIRTY-SOURCE-EXCLUSION` paths
- whether the optional source-branch pull ran or was skipped
- feature branch and worktree path
- phase completed and next required phase
- default-branch merge status before PR merge
- review and verification status
- PR URL and merge status
- local worktree removal, local branch deletion, remote branch deletion, and final worktree-list health
