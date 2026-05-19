---
name: re
description: Review current-branch git changes in the active worktree for bugs, conventions compliance, and code quality
---

# Review Skill

Use this skill when the user asks to review current code changes, check their diff, or audit work that belongs to the currently checked out branch in the active worktree.

## Execution

1. Establish the review scope for the active worktree only:
   - Run `git branch --show-current` to identify the current branch
   - Determine the comparison base for that branch:
     - Prefer the current branch upstream if one exists
     - Otherwise fall back to `origin/main`, then `main`
   - Never inspect other worktrees, other branch tips, or unrelated repo state unless the user explicitly asks

2. Collect only diffs that belong to the current worktree and current branch:
   - Run `git diff` for unstaged changes in the active worktree
   - Run `git diff --cached` for staged changes in the active worktree
   - Run `git diff <merge-base>..HEAD` to review commits that exist on the current branch and are not yet in the comparison base
   - If all three are empty, inform the user there are no current-branch changes to review and stop

3. Load project conventions from `.agents/conventions.md` and any relevant `CLAUDE.md` files.

4. Review changes for:
   - **Bugs**: Logic errors, off-by-one, null/undefined mishandling, race conditions
   - **Convention violations**: Firestore `undefined` values, `alert()`/`confirm()` usage, missing Toast/ConfirmationModal patterns, type safety issues
   - **Security**: Exposed secrets, injection risks, insecure patterns
   - **Code quality**: Dead code, unnecessary complexity, missing error handling at system boundaries
   - **Cloud Functions entrypoint parity**: If the diff adds or changes an export in `functions/src/index.ts`, the change MUST include a direct companion `*.test.ts` or `*.contract.test.ts` next to the source module. Flag any new entrypoint that lacks one as a Critical issue. Adding a new entrypoint path to `functions/scripts/entrypoint-test-parity.allowlist.json` is not acceptable — the allowlist only covers pre-existing debt.
   - **Backend entrypoint matrix sync**: If the diff changes coverage status for an entrypoint (adds/removes a direct test, or adds/renames an exported entrypoint), the change MUST also update `docs/testing/functions-entrypoint-matrix.md` in the same PR. Flag missing matrix updates as Important.
   - **High-risk backend helpers**: If the diff touches backend helper modules on the tracking or reminder paths (for example `functions/src/shared/trackingReconcile.ts`, `functions/src/shared/userCardTracking.ts`, or anything under `functions/src/shared/` consumed by `reconcileAllTracking`, `sendBenefitReminders`, or `onUserCardCreated`), require a direct peer test even though these helpers are not themselves entrypoints. Flag uncovered non-trivial helper changes as Important.

5. Report findings in this format:

   ```
   ## Review: <branch name>

   ### Critical Issues (must fix)
   - [file:line] Description

   ### Important Issues (should fix)
   - [file:line] Description

   ### Suggestions (nice to have)
   - [file:line] Description

   ### Summary
   X file(s) reviewed, Y issue(s) found.
   ```

   If no issues are found, report a clean review.

## Notes

- Focus only on changed lines from the active worktree and current branch — do not flag pre-existing issues in unchanged code or unrelated branches.
- Treat `git diff`, `git diff --cached`, and the current branch diff from its merge-base as the full review surface unless the user requests a wider scope.
- Do not run build, lint, or tests — assume CI handles those separately.
- Read full file context around changes when needed to understand intent.
