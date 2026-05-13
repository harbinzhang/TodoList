---
name: sync-core-branches
description: Execute a two-stage branch sync (current->main, main->configured release/core branches) with optional auto conflict resolution
---

# Sync Core Branches

Execute a two-stage branch sync: current branch → main → configured release/core branches, with optional automatic conflict resolution.

## Execution

1. **Pre-flight checks**:
   - Ensure working tree is clean (`git status --porcelain` is empty)
   - Identify current branch (`git branch --show-current`)
   - Fetch latest from origin (`git fetch origin`)

2. **Stage 1: Current branch → main**:
   ```bash
   git checkout main
   git pull origin main
   git merge <current-branch>
   ```
   - If merge conflicts arise, attempt auto-resolution for known safe patterns (e.g., version bumps)
   - For non-trivial conflicts, stop and report to user

3. **Stage 2: Main → configured release/core branches**:
   ```bash
   git checkout <target-branch>
   git pull origin <target-branch>
   git merge main
   ```
   - Same conflict handling as Stage 1

4. **Push results**:
   ```bash
   git push origin main
   git push origin <target-branch>
   ```
   - Ask for user confirmation before pushing

5. **Return to original branch**:
   ```bash
   git checkout <original-branch>
   ```

6. **Report**:
   ```
   ## Branch Sync Complete

   - Current branch: <name>
   - Stage 1 (→ main): success/failed
   - Stage 2 (main → target branches): success/failed
   - Pushed: yes/no
   - Conflicts: none / list
   ```

## Error Recovery

- If Stage 1 fails, abort the merge and return to the original branch
- If Stage 2 fails, abort the merge, return to original branch, and report that main was updated but one or more target branches were not
- Never force-push

## Notes

- This skill does NOT handle version bumps — use `/release` for that.
- If the user only wants to sync to main, do only Stage 1.
- Default target branches are controlled by `CORE_SYNC_BRANCHES`; this repo currently defaults to `native-release,ios-release`.
