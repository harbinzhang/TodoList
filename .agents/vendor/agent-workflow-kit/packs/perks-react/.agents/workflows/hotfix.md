---
description: How to create a short-lived production hotfix from a released tag, optionally cherry-pick selected commits, run patch release verification, release it through main, and clean up the hotfix branch/worktree
---

# Production Hotfix Workflow

Use this workflow when the task is to fix production from a released version instead of from the current branch tip, especially when unrelated in-progress work must stay out of the release.

This workflow creates a short-lived hotfix worktree from a release tag, optionally cherry-picks a reviewed ordered list of commits, runs the normal release verification gate, invokes the canonical `patch` release flow from the hotfix branch, and then deletes the hotfix branch/worktree. Production deploy remains a separate explicit step.

If the user really wants the current branch shipped as-is, use `.agents/workflows/release.md` or `.agents/workflows/ship.md` instead. Do not use those workflows to emulate a production hotfix by hand.

## Scope

- Resolve a production base tag, defaulting to the latest semver tag
- Create a dedicated hotfix branch and worktree from that tag
- Optionally inspect and cherry-pick a reviewed ordered list of commits
- Allow direct minimal hotfix edits when no cherry-picks are provided
- Run smallest relevant checks for the hotfix scope
- Run the full `npm run release:verify` gate before release
- Feed the hotfix branch into the canonical `patch` release workflow so the fix lands on `main` and gets a new semver tag
- Delete the hotfix worktree and hotfix branch after success

## Non-Goals

- Do not deploy to production from this workflow
- Do not merge `origin/main` or an entire dev branch into the hotfix branch
- Do not turn the hotfix branch into a long-lived stable branch
- Do not expand a narrow hotfix into a broad catch-up release

## Inputs

- `tag` (optional) — default to the latest semver tag after `git fetch --prune --tags origin`
- `source_branch` (optional) — used only to inspect or validate candidate commits
- `pick_commits` (optional, ordered) — exact SHAs to cherry-pick with `-x`
- `slug` (optional) — short lowercase hyphen-case task identifier

## Default Interpretation

When the user names both a release tag and a target commit, the default meaning is:

- start from the release tag
- cherry-pick the named commit onto that release base
- release and tag the new hotfix commit created by the cherry-pick
- do not automatically include intermediate commits that happen to exist between the release tag and the target commit on the source branch

Example:

- User asks for "`v0.8.26` plus `11f927cc`"
- Correct behavior: create a new hotfix branch from `v0.8.26`, cherry-pick `11f927cc`, verify that new commit, and tag/release the new hotfix commit
- Incorrect behavior: tag the original `11f927cc` commit directly when `v0.8.26..11f927cc` contains other commits

## Canonical Naming

Assume:

```bash
PRIMARY_WORKTREE=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "${PRIMARY_WORKTREE}")
HOTFIX_TAG="${HOTFIX_TAG:-$(git tag --list 'v[0-9]*' --sort=-v:refname | head -n 1)}"
SLUG="<user-provided-or-derived-slug>"
HOTFIX_BRANCH="codex/hotfix-${SLUG}-${HOTFIX_TAG}"
HOTFIX_ROOT="$HOME/.codex/worktrees/hotfix-${HOTFIX_TAG}-${SLUG}"
HOTFIX_WORKTREE="${HOTFIX_ROOT}/${REPO_NAME}"
```

Rules:

- Keep the tag literal in both the branch name and the worktree directory so the production base remains obvious.
- Derive the branch from the release tag, not from the current branch tip.
- Keep the original worktree untouched; dirty local changes there are allowed and are not part of the hotfix scope.

## Hard Stops

Stop and report before continuing if any of these occur:

- No semver release tag can be resolved
- The requested `tag` does not exist locally after fetch
- `HOTFIX_BRANCH` already exists locally or on `origin`
- `HOTFIX_WORKTREE` already exists or is already registered in `git worktree list`
- A requested `source_branch` does not exist
- A requested commit cannot be resolved to a non-merge commit
- A selected commit clearly depends on unpublished omitted commits
- Any cherry-pick conflicts
- The hotfix changes fail the smallest relevant verification or `npm run release:verify`
- The patch release cannot be completed cleanly
- Cleanup leaves a stale local worktree or hotfix branch behind

## Pre-Flight Checks

Run from the original workspace:

```bash
git fetch --prune --tags origin
git status --short --branch
git tag --list 'v[0-9]*' --sort=-v:refname | head -n 5
git worktree prune
git worktree list
git show-ref --verify --quiet "refs/tags/${HOTFIX_TAG}"
git show-ref --verify --quiet "refs/heads/${HOTFIX_BRANCH}"
git ls-remote --exit-code --heads origin "${HOTFIX_BRANCH}"
```

Notes:

- The starting worktree does not need to be clean. This workflow exists specifically to avoid dragging unrelated local changes into the release.
- If `source_branch` is provided, fetch and verify it before creating the hotfix worktree:

```bash
SOURCE_BRANCH="<branch-without-origin-prefix>"
git fetch origin "+refs/heads/${SOURCE_BRANCH}:refs/remotes/origin/${SOURCE_BRANCH}"
git rev-parse --verify "origin/${SOURCE_BRANCH}"
```

Pass conditions:

- `HOTFIX_TAG` resolves to a real tag
- local hotfix branch lookup fails
- remote hotfix branch lookup fails
- no existing worktree path matches `HOTFIX_WORKTREE`

## Phase 1: Create the Hotfix Worktree

Create the isolated hotfix workspace from the resolved tag:

```bash
mkdir -p "${HOTFIX_ROOT}"
git worktree add -b "${HOTFIX_BRANCH}" "${HOTFIX_WORKTREE}" "${HOTFIX_TAG}"
cd "${HOTFIX_WORKTREE}"
git status --short --branch
git rev-parse HEAD
git describe --tags --exact-match HEAD
```

Pass conditions:

- `HEAD` matches the resolved `HOTFIX_TAG`
- the new hotfix worktree is clean
- the original workspace remains untouched

## Phase 2: Apply the Fix

Choose exactly one of these modes.

### Mode A: Cherry-Pick Reviewed Commits

Use this mode only when the user gave explicit commits to bring into the hotfix.

Inspect the candidate commit list before picking:

```bash
git log --oneline --decorate --graph -n 30
git show --stat --summary <sha>
git rev-list --parents -n 1 <sha>
```

Validation rules:

- `git rev-list --parents -n 1 <sha>` must show exactly one parent. If more than one parent is present, the commit is a merge commit and this workflow must stop.
- If `source_branch` was provided, each picked commit must be reachable from `origin/${SOURCE_BRANCH}`.
- Review the unpublished range before picking. If the selected commit depends on earlier omitted commits from the same unpublished line, stop and either explicitly approve those commits or switch to the normal release flow.
- When the user asked for `release + commit`, treat the named commit as a patch to be replayed on the release base. Do not treat the commits in `${HOTFIX_TAG}..<sha>` as implicitly selected.
- Preserve order exactly as provided by the user.

Cherry-pick the approved commits:

```bash
git cherry-pick -x <sha-1>
git cherry-pick -x <sha-2>
git cherry-pick -x <sha-3>
```

If any cherry-pick conflicts, stop immediately. Do not auto-resolve broad conflicts, do not merge the whole branch, and do not continue to release.

After the picks succeed, inspect the resulting delta:

```bash
git log --oneline "${HOTFIX_TAG}"..HEAD
git diff --stat "${HOTFIX_TAG}"..HEAD
```

The resulting range should contain only the intended hotfix lineage.

If the hotfix is driven by a single requested commit, the expected result is:

- one new cherry-picked hotfix commit on top of `HOTFIX_TAG`
- commit message retains `(cherry picked from commit <sha>)`
- the hotfix tag/release points to the new hotfix commit, not the original source-branch commit

### Mode B: Direct Hotfix Edits

Use this mode when no `pick_commits` were supplied.

- Make the smallest production-safe change directly on the hotfix branch.
- Do not merge `origin/main`, `release-branch`, or any dev/feature branch into the hotfix branch.
- Keep commits focused and conventional so the release intent stays readable.

## Phase 3: Verify the Hotfix

Before the full release gate, run the smallest relevant verification for the changed scope:

- changed UI/component logic: targeted Vitest or the smallest meaningful frontend build/test command
- changed Functions/runtime logic: targeted Functions test/build command
- changed cross-cutting or ambiguous scope: move directly to the full gate

Then run the full release gate from the hotfix worktree:

```bash
npm run release:verify
```

Release cannot continue unless this full gate passes on the exact hotfix branch tip.

## Phase 4: Run the Canonical Patch Release

Stay inside the hotfix worktree and invoke `.agents/workflows/release.md` with `BUMP=patch`.

Important constraints:

- Treat the hotfix branch as the canonical starting branch for the release flow.
- Do not create another temporary release branch or another worktree for the release step.
- The expected lineage after release is `hotfix branch -> main -> hotfix branch`.
- The resulting patch tag on `main` becomes the new production source of truth.
- Production deploy still does not happen here.

Required behavior from the canonical release workflow:

- run `npm run release:verify` on the hotfix branch
- merge the hotfix branch into `main`
- verify the exact hotfix source commit is in `main` ancestry
- run `npm run release:verify` on `main`
- run `npm version patch --no-git-tag-version`
- rerun `npm run release:verify` on the bumped release commit
- commit and push the bump
- create and push the new annotated tag
- merge `main` back into the hotfix branch and push the hotfix branch

If any step above fails, stop and report the blocker. Do not run production deploy commands as a fallback.

## Phase 5: Clean Up the Hotfix Branch and Worktree

After the patch release succeeds, remove the hotfix workspace and branch so `main` and the new tag are the only permanent references.

Run from the original workspace:

```bash
cd "${PRIMARY_WORKTREE}"
git worktree remove "${HOTFIX_WORKTREE}"
git branch -d "${HOTFIX_BRANCH}"
git push origin --delete "${HOTFIX_BRANCH}"
git worktree prune
git worktree list
git show-ref --verify --quiet "refs/heads/${HOTFIX_BRANCH}"
git ls-remote --exit-code --heads origin "${HOTFIX_BRANCH}"
```

Cleanup pass conditions:

- `HOTFIX_WORKTREE` no longer appears in `git worktree list`
- local branch lookup fails
- remote branch lookup fails

If cleanup fails, stop and report the residual branch/worktree state.

## Reporting

Always report:

- resolved `HOTFIX_TAG` and its base commit
- hotfix branch and worktree path
- whether the fix used cherry-picks or direct edits
- `source_branch` and ordered `pick_commits`, when provided
- requested source commit and resulting cherry-picked hotfix commit, when the user asked for `release + commit`
- whether cherry-pick provenance was preserved with `-x`
- smallest relevant verification run before release
- full `npm run release:verify` status
- resulting patch tag and `main` sync result
- local worktree removal, local branch deletion, and remote branch deletion status
- production boundary status: not deployed here
