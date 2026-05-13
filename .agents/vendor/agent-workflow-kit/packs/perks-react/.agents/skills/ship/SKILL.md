---
name: ship
description: Optionally sync a named remote branch into the current branch, then sync remote main, commit intended changes, run the patch release workflow, deploy the released build to Firebase staging, and run staging validation. Use when the user asks to ship the current branch, do a patch ship, commit current work then patch release, or patch release plus staging deploy and staging tests.
---

# Ship Skill

Canonical workflow doc: `.agents/workflows/ship.md`

Use this skill when the user wants the current branch taken all the way through a patch ship: optionally sync a named remote branch into the current branch, sync the current branch from remote `main`, commit the intended branch changes, perform a `patch` release, deploy the released build to staging, and validate staging with the project staging-test skills.

If the user wants to fix production from a released tag, cherry-pick only selected commits, or bypass unrelated in-progress work on the current branch, use the `hotfix` skill instead of `ship`.

If the invocation includes a branch argument, for example `$ship dev6`, treat it as a remote source branch to merge into the currently checked out branch before the normal ship flow. Do not switch branches unless the user explicitly asks. After that optional branch sync, the first normal ship step is still syncing from remote `main`.

This skill orchestrates the canonical `release`, `deploy`, `staging-qa`, `staging-user-journey-verification`, and `staging-tracker-verification` skills. Load those skill/workflow docs as needed instead of duplicating their details.

## Safety

- Patch only. If the user asks for `minor`, `major`, mobile store upload, or production rollout, use the dedicated release/deploy/mobile release workflows instead.
- Do not blindly commit every dirty file. Review `git status` and diffs, commit intended release-scope changes, and exclude secrets, env files, scratch files, logs, local worktrees, and unrelated runtime/config changes.
- When a branch argument is provided, fetch `origin/<branch>` and merge it into the current branch before the remote `main` sync. Hard stop if the remote branch does not exist or cannot be merged cleanly.
- Before final release-prep commits, fetch `origin/main` and merge it into the current branch so conflicts surface before the patch release flow tries to sync back to `main`.
- Before invoking the release workflow, inspect `git worktree list`; if another clean worktree is holding `main`, delete that worktree so release can check out `main` locally. Hard stop instead of deleting if that `main` worktree is dirty or otherwise unsafe to remove.
- Hard stop if release verification, staging deploy, or staging validation fails. Do not continue to the next phase until the blocker is understood and fixed.
- Production deploy is out of scope. This skill deploys staging only.
- Run staging validation after a successful staging deploy unless the user explicitly says to skip it. For full staging deploys, the deploy workflow now auto-runs the strict default `staging-qa` gate.

## Execution

1. Load `.agents/workflows/ship.md`.
2. Check `.agents/conventions.md` for repo safety rules.
3. Identify the starting branch, any branch argument, and classify dirty files into intended release changes, non-release support changes, temporary/local-only artifacts, and blockers.
4. If a branch argument is present, fetch `origin/<branch>` and merge it into the current branch first; if local edits prevent the sync, protect intentional work first and do not hide conflicts.
5. Fetch `origin/main` and merge it into the current branch before finalizing release-prep commits; if local edits prevent the sync, protect intentional work first and do not hide conflicts.
6. Commit the intended files on the current branch with focused conventional commit message(s), then push the branch.
7. Before invoking release, inspect `git worktree list`; if another worktree holds `main`, delete it when clean and hard stop when it has local changes.
8. Run the canonical `release` skill with a `patch` bump from the current branch.
9. After the patch release completes and the branch is synced back from `main`, run the canonical `deploy` skill for a full Firebase staging deploy.
10. Treat the deploy workflow's auto-run strict `staging-qa` result as the default post-deploy gate. Rerun it manually only when troubleshooting or when the user asks for a fresh rerun.
11. Add targeted staging validation when the released scope needs it:
   - use `staging-user-journey-verification` for broad auth, dashboard, wallet, tracker, settings, or read/write journey changes
   - use `staging-tracker-verification` for benefit cadence, `userCards`, tracking docs, deterministic tracking IDs, or trigger-generated tracker rows
12. Report release version/tag, branch sync status, staging deploy status, staging validation status, commands run, and any blockers or skipped checks.

## Outputs

- Starting branch and committed release-scope changes
- Optional named remote branch pre-sync result
- Remote `main` pre-sync result
- `main` worktree cleanup result before release
- Patch version and semver tag
- Release verification status
- Staging deploy target and result
- Staging validation skills/commands run
- Cleanup status for any temporary staging records
- Final scoped worktree status
