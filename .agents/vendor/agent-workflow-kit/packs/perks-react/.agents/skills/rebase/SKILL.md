---
name: rebase
description: "Use when the user wants to discard pending local tracked and untracked changes in the current worktree and recreate the worktree on a fresh branch reset to origin/dev6 by default or a named remote branch, without a second interactive confirmation."
---

# Rebase (Create Fresh Branch, Hard Reset to Remote)

Creates a fresh branch from the branch currently checked out in this worktree,
then hard-resets that fresh branch to a resolved remote ref. `/rebase` defaults
to `origin/dev6`, equivalent to `/rebase dev6`. `/rebase release-branch` means
"in this current worktree, create a new branch and hard-reset it to
`origin/release-branch`." All uncommitted modifications to tracked files and
normal untracked files are permanently discarded from the worktree. Ignored
files, such as local env files and dependency folders, are preserved. The
`/rebase` invocation itself is approval to proceed after the pre-reset summary
is shown; do not ask for a second interactive confirmation.

## What this skill owns

- Detecting the current branch and parsing an optional target branch argument
- Resolving the target remote ref from `origin/dev6` by default or from the
  user supplied branch name
- Creating a fresh branch from the current HEAD before the hard reset
- Displaying every dirty file the user is about to lose
- Treating the explicit `/rebase` invocation as approval, with no second
  interactive confirmation prompt
- Running `git reset --hard <remote-ref>`
- Running `git clean -fd` to remove normal untracked files
- Pointing the fresh branch's upstream at the resolved target ref
- Reporting the final HEAD and which files were dropped

## What this skill does NOT own

- Merging, rebasing onto another branch, or pulling new upstream commits
- Cleaning ignored files (`git clean -fd` intentionally does not use `-x`)
- Stashing or preserving any local changes
- Repointing, resetting, or otherwise modifying the original branch after the
  fresh branch is created
- Checking out or modifying any other worktree, even if the supplied branch
  name is currently checked out somewhere else

## Safety

- **Never run `git reset --hard` or `git clean -fd` without first listing the dirty files and showing the pre-reset summary.** The user cannot undo this for uncommitted work, but the `/rebase` command is already the approval to proceed.
- Do not ask for an additional interactive yes/no confirmation after the pre-reset summary. Continue directly unless a required safety check fails.
- Always create and switch to a fresh branch before running `git reset --hard`. Create it only after the pre-reset summary, and before the reset.
- The fresh branch name must be based on the resolved target ref's branch name plus a random 6- or 8-character UUID-style suffix, for example `release-branch-rebase-a1b2c3d4`. Prefer 8 characters.
- If the worktree is clean (`git status --short` is empty), note this in the summary and continue without an extra confirmation, since HEAD will still move.
- If the user supplied a branch argument like `release-branch`, resolve it to `origin/release-branch`. If they supplied a remote-qualified ref like `origin/release-branch`, use it as-is.
- If no branch argument was supplied, resolve the target as `origin/dev6`. Do not use the current branch's upstream as the default target.
- Treat any supplied branch name only as input for remote-ref resolution. Do not inspect, switch to, or modify the worktree where that branch may be checked out.
- Untracked files (`??`) are removed by this skill via `git clean -fd`. Ignored files are not removed because `-x` is intentionally not used.
- Never stash, never force-push, never touch other worktrees.

## Execution

1. **Detect the original branch and resolve the target remote ref**
   ```bash
   BRANCH=$(git branch --show-current)
   [ -n "${BRANCH}" ] || { echo "ERROR: not on a branch"; exit 1; }
   RAW_TARGET_ARG="${1:-}"
   TARGET_ARG="${RAW_TARGET_ARG:-dev6}"
   case "${TARGET_ARG}" in
     */*) TARGET_REF="${TARGET_ARG}" ;;
     *) TARGET_REF="origin/${TARGET_ARG}" ;;
   esac
   ```

2. **Verify the target remote ref exists**
   ```bash
   git fetch --quiet   # refresh remote state
   git rev-parse --verify "${TARGET_REF}" > /dev/null 2>&1 || { echo "ERROR: ${TARGET_REF} not found"; exit 1; }
   ```

3. **Show dirty state**
   ```bash
   git status --short --untracked-files=all
   git clean -nd
   ```
   List every `M`, `A`, `D`, `R` file that will be lost.
   Note separately every `??` untracked file or directory that will be removed.
   `git clean -nd` is a dry run preview; do not use `-x`.

4. **Generate the fresh branch name from the target ref**
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
   Use the target ref's branch name as the base, plus a 6- or 8-character random UUID-style suffix. Prefer 8 characters.

5. **Show the pre-reset summary, then continue automatically** — show a summary like:
   ```
   About to sync from <TARGET_REF>. The /rebase invocation is approval to continue.
   Original branch in this worktree: <BRANCH>
   Fresh branch to create first: <NEW_BRANCH>
   Explicit target argument: <RAW_TARGET_ARG or none>
   Effective target branch: <TARGET_ARG>
   Default target when no argument supplied: dev6
   Tracked files that will be permanently discarded: <N>
   Untracked files/directories that will be permanently removed: <M>
   Ignored files/directories: preserved
   Original branch after reset: unchanged
   Fresh branch upstream after reset: <TARGET_REF>
   ```
   Do not pause for a second confirmation prompt.

6. **Create the fresh branch, reset it, then remove normal untracked files**
   ```bash
   git switch -c "${NEW_BRANCH}"
   git reset --hard "${TARGET_REF}"
   git clean -fd
   git branch --set-upstream-to="${TARGET_REF}" "${NEW_BRANCH}"
   ```

7. **Report**
   - New HEAD (commit hash + message)
   - Original branch, fresh branch, and resolved target ref used for the reset
   - Confirm the original branch pointer/upstream was left unchanged
   - Confirm the fresh branch upstream now points at the target ref
   - List of tracked files that were dropped
   - List of untracked files/directories that were removed
   - Reminder that ignored files were preserved
