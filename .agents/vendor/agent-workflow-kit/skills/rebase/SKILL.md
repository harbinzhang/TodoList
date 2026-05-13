---
name: rebase
description: "Use when the user asks to recreate the current worktree on a fresh branch reset to its upstream or a named remote branch while discarding tracked and normal untracked local changes."
---

# Rebase (Create Fresh Branch, Hard Reset to Remote)

Create a fresh branch from the branch currently checked out in this worktree,
then hard-reset that fresh branch to a resolved remote ref. The original branch
pointer is left unchanged.

This skill is destructive for tracked local changes and normal untracked files.
Ignored files, such as local env files and dependency folders, are preserved
because cleanup uses `git clean -fd`, not `git clean -fdx`.

## Inputs

- No argument: use the current branch upstream. If no upstream is configured,
  try `origin/<current-branch>`.
- Branch argument: `main` resolves to `origin/main`.
- Remote-qualified argument: `origin/main` is used as-is.

Consumer repos may provide repo-local overrides for different defaults, such as
pinning no-argument runs to a specific remote branch. Keep those branch names in
consumer overrides rather than this shared skill.

## What this skill owns

- Detecting the current branch and parsing an optional target branch argument.
- Resolving the target remote ref from the current branch upstream by default or
  from the user supplied branch name.
- Creating a fresh branch from the current HEAD before the hard reset.
- Displaying every dirty file the user is about to lose.
- Treating the explicit rebase invocation as approval, with no second
  interactive confirmation prompt after the pre-reset summary.
- Running `git reset --hard <remote-ref>`.
- Running `git clean -fd` to remove normal untracked files.
- Pointing the fresh branch's upstream at the resolved target ref.
- Reporting the final HEAD and which files were dropped.

## What this skill does NOT own

- Merging, rebasing onto another branch, or pulling new upstream commits.
- Cleaning ignored files (`git clean -fd` intentionally does not use `-x`).
- Stashing or preserving any local changes.
- Repointing, resetting, or otherwise modifying the original branch after the
  fresh branch is created.
- Checking out or modifying any other worktree, even if the supplied branch
  name is currently checked out somewhere else.

## Safety

- Never run `git reset --hard` or `git clean -fd` before showing dirty files and
  a pre-reset summary. The user cannot undo this for uncommitted work.
- The explicit rebase request is approval to continue after the pre-reset
  summary. Do not ask for another yes/no confirmation unless a required safety
  check fails or the user's request is ambiguous.
- Always create and switch to a fresh branch before `git reset --hard`. Create
  it only after the pre-reset summary, and before the reset.
- Name the fresh branch from the resolved target ref plus a random 6- or
  8-character suffix, for example `main-rebase-a1b2c3d4`. Prefer 8 characters.
- If the worktree is clean (`git status --short` is empty), note this in the
  summary and continue without an extra confirmation, since HEAD may still move.
- If the user supplied a branch argument like `release-branch`, resolve it to
  `origin/release-branch`. If they supplied a remote-qualified ref like
  `origin/release-branch`, use it as-is.
- Treat any supplied branch name only as input for remote-ref resolution. Do not
  inspect, switch to, or modify the worktree where that branch may be checked
  out.
- Normal untracked files (`??`) are removed by this skill via `git clean -fd`.
  Ignored files are not removed because `-x` is intentionally not used.
- Never stash, never force-push, never touch other worktrees.

## Procedure

1. Resolve the current branch and target ref.
   ```bash
   BRANCH=$(git branch --show-current)
   [ -n "${BRANCH}" ] || { echo "ERROR: not on a branch"; exit 1; }

   TARGET_ARG="${1:-}"
   if [ -n "${TARGET_ARG}" ]; then
     case "${TARGET_ARG}" in
       */*) TARGET_REF="${TARGET_ARG}" ;;
       *) TARGET_REF="origin/${TARGET_ARG}" ;;
     esac
   else
     TARGET_REF=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "origin/${BRANCH}")
   fi
   ```

2. Refresh and verify the target ref.
   ```bash
   git fetch --quiet
   git rev-parse --verify "${TARGET_REF}" >/dev/null 2>&1 || {
     echo "ERROR: ${TARGET_REF} not found"
     exit 1
   }
   ```

3. Show dirty state.
   ```bash
   git status --short --untracked-files=all
   git clean -nd
   ```
   List every `M`, `A`, `D`, and `R` tracked file that will be lost.
   Note separately every `??` untracked file or directory that will be removed.
   `git clean -nd` is a dry run preview; do not use `-x`.

4. Generate the fresh branch name from the target ref.
   ```bash
   TARGET_NAME="${TARGET_REF#refs/remotes/}"
   case "${TARGET_NAME}" in
     */*) TARGET_BRANCH_BASE="${TARGET_NAME#*/}" ;;
     *) TARGET_BRANCH_BASE="${TARGET_NAME}" ;;
   esac

   SAFE_BRANCH=$(printf '%s' "${TARGET_BRANCH_BASE}" | sed 's#[^A-Za-z0-9._/-]#-#g')
   [ -n "${SAFE_BRANCH}" ] || { echo "ERROR: could not derive branch base from ${TARGET_REF}"; exit 1; }

   for _ in 1 2 3 4 5; do
     SUFFIX=$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | cut -c1-8)
     NEW_BRANCH="${SAFE_BRANCH}-rebase-${SUFFIX}"
     git show-ref --verify --quiet "refs/heads/${NEW_BRANCH}" || break
     NEW_BRANCH=""
   done
   [ -n "${NEW_BRANCH}" ] || { echo "ERROR: could not generate a unique branch name"; exit 1; }
   ```

5. Print the pre-reset summary:
   ```text
   About to reset a fresh branch from <TARGET_REF>.
   The rebase invocation is approval to continue.
   Original branch in this worktree: <BRANCH>
   Fresh branch to create first: <NEW_BRANCH>
   Explicit target argument: <TARGET_ARG or none>
   Tracked files that will be permanently discarded: <N>
   Untracked files/directories that will be permanently removed: <M>
   Ignored files/directories: preserved
   Original branch after reset: unchanged
   Fresh branch upstream after reset: <TARGET_REF>
   ```
   Continue automatically after the summary unless a safety check failed.

6. Create the fresh branch, reset it, remove normal untracked files, and set
   upstream.
   ```bash
   git switch -c "${NEW_BRANCH}"
   git reset --hard "${TARGET_REF}"
   git clean -fd
   git branch --set-upstream-to="${TARGET_REF}" "${NEW_BRANCH}"
   ```

7. Report the new HEAD, original branch, fresh branch, target ref, discarded
   tracked files, removed untracked files/directories, and preserved ignored
   files.
