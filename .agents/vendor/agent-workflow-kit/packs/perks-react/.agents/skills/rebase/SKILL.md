---
name: rebase
description: "Use when the user wants to discard pending local tracked changes in the current worktree and recreate the worktree on a fresh branch reset to its upstream or a named remote branch such as `dev6`, without a second interactive confirmation."
---

# Rebase (Create Fresh Branch, Hard Reset to Remote)

Creates a fresh branch from the branch currently checked out in this worktree,
then hard-resets that fresh branch to a resolved remote ref. `/rebase` uses the
original branch's existing upstream as the target. `/rebase dev6` means "in this
current worktree, create a new branch and hard-reset it to `origin/dev6`." All
uncommitted modifications to tracked files are permanently discarded from the
worktree. The `/rebase` invocation itself is approval to proceed after the
pre-reset summary is shown; do not ask for a second interactive confirmation.

## What this skill owns

- Detecting the current branch and parsing an optional target branch argument
- Resolving the target remote ref from either the current upstream or the user
  supplied branch name
- Creating a fresh branch from the current HEAD before the hard reset
- Displaying every dirty file the user is about to lose
- Treating the explicit `/rebase` invocation as approval, with no second
  interactive confirmation prompt
- Running `git reset --hard <remote-ref>`
- Pointing the fresh branch's upstream at the resolved target ref
- Reporting the final HEAD and which files were dropped

## What this skill does NOT own

- Merging, rebasing onto another branch, or pulling new upstream commits
- Cleaning untracked files (`??` entries survive `git reset --hard` by design)
- Stashing or preserving any local changes
- Repointing, resetting, or otherwise modifying the original branch after the
  fresh branch is created
- Checking out or modifying any other worktree, even if the supplied branch
  name is currently checked out somewhere else

## Safety

- **Never run `git reset --hard` without first listing the dirty files and showing the pre-reset summary.** The user cannot undo this for uncommitted work, but the `/rebase` command is already the approval to proceed.
- Do not ask for an additional interactive yes/no confirmation after the pre-reset summary. Continue directly unless a required safety check fails.
- Always create and switch to a fresh branch before running `git reset --hard`. Create it only after the pre-reset summary, and before the reset.
- The fresh branch name must be based on the resolved target ref's branch name plus a random 6- or 8-character UUID-style suffix, for example `dev6-rebase-a1b2c3d4`. Prefer 8 characters.
- If the worktree is clean (`git status --short` is empty), note this in the summary and continue without an extra confirmation, since HEAD will still move.
- If the user supplied a branch argument like `dev6`, resolve it to `origin/dev6`. If they supplied a remote-qualified ref like `origin/dev6`, use it as-is.
- If no branch argument was supplied, resolve the upstream ref via `git rev-parse --abbrev-ref --symbolic-full-name @{u}` first. If no upstream is configured, fall back to `origin/<branch>`. If neither resolves, stop and report the blocker rather than guessing.
- Treat any supplied branch name only as input for remote-ref resolution. Do not inspect, switch to, or modify the worktree where that branch may be checked out.
- Untracked files (`??`) are NOT removed by this skill. Mention this explicitly in the pre-reset summary so the user is not surprised.
- Never stash, never force-push, never touch other worktrees.

## Execution

1. **Detect the original branch and resolve the target remote ref**
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

2. **Verify the target remote ref exists**
   ```bash
   git fetch --quiet   # refresh remote state
   git rev-parse --verify "${TARGET_REF}" > /dev/null 2>&1 || { echo "ERROR: ${TARGET_REF} not found"; exit 1; }
   ```

3. **Show dirty state**
   ```bash
   git status --short
   ```
   List every `M`, `A`, `D`, `R` file that will be lost.
   Note separately any `??` untracked files that will survive.

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
   Explicit target argument: <TARGET_ARG or none>
   Files that will be permanently discarded: <N>
   Untracked files (will NOT be removed): <M>
   Original branch after reset: unchanged
   Fresh branch upstream after reset: <TARGET_REF>
   ```
   Do not pause for a second confirmation prompt.

6. **Create the fresh branch, then reset it**
   ```bash
   git switch -c "${NEW_BRANCH}"
   git reset --hard "${TARGET_REF}"
   git branch --set-upstream-to="${TARGET_REF}" "${NEW_BRANCH}"
   ```

7. **Report**
   - New HEAD (commit hash + message)
   - Original branch, fresh branch, and resolved target ref used for the reset
   - Confirm the original branch pointer/upstream was left unchanged
   - Confirm the fresh branch upstream now points at the target ref
   - List of files that were dropped
   - Reminder that untracked files remain untouched
