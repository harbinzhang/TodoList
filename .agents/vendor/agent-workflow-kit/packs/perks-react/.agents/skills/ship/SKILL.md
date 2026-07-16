---
name: ship
description: Use when shipping through the fixed release-branch branch by optionally syncing a named remote branch, syncing remote main, aligning root dependencies, running local-only and i18n staging gates, running a patch release, deploying Firebase staging, validating staging, and deploying staging admin Hosting.
---

# Ship Skill

Canonical workflow doc: `.agents/workflows/ship.md`

Use this skill when the user wants the fixed `release-branch` branch taken all the way through a patch ship: optionally sync a named remote branch into `release-branch`, sync `release-branch` from remote `main`, commit the intended branch changes, run scope-aware local-only verification plus the pre-staging i18n sync gate, perform a `patch` release from `release-branch`, deploy the released build to staging, validate staging with the project staging-test skills, and finish by deploying staging admin Hosting.

If the user wants to fix production from a released tag, cherry-pick only selected commits, or bypass unrelated in-progress work on the current branch, use the `hotfix` skill instead of `ship`.

All ship runs use the exact branch named `release-branch` as the release source. At the start of the workflow, fetch `origin/release-branch`, check out the local `release-branch` that tracks it, and hard stop if that branch is missing or cannot be checked out safely. If the invocation includes a branch argument, for example `$ship feature/my-branch`, treat it as a remote source branch to merge into `release-branch` before the normal ship flow. After that optional branch sync, the first normal ship step is still syncing `release-branch` from remote `main`.

This skill orchestrates the canonical `i18n-staging-sync`, `release`, `deploy`, `staging-qa`, `staging-user-journey-verification`, and `staging-tracker-verification` skills. Load those skill/workflow docs as needed instead of duplicating their details.

## Safety

- Patch only. If the user asks for `minor`, `major`, mobile store upload, or production rollout, use the dedicated release/deploy/mobile release workflows instead.
- Do not blindly commit every dirty file. Review `git status` and diffs, commit intended release-scope changes, and exclude secrets, env files, scratch files, logs, local worktrees, and unrelated runtime/config changes.
- Do not use an arbitrary starting branch as the release source. Ship must happen from the exact local branch `release-branch` tracking `origin/release-branch`.
- When a branch argument is provided, fetch `origin/<branch>` and merge it into `release-branch` before the remote `main` sync. Hard stop if the remote branch does not exist or cannot be merged cleanly.
- Before final release-prep commits, fetch `origin/main` and merge it into `release-branch` so conflicts surface before the patch release flow tries to sync back to `main`.
- Before invoking the release workflow, inspect `git worktree list`; if another clean worktree is holding `main`, delete that worktree so release can check out `main` locally. Hard stop instead of deleting if that `main` worktree is dirty or otherwise unsafe to remove.
- Before invoking the release workflow, run the scope-aware local verification gate from `.agents/workflows/ship.md`: align root dependencies with `npm install`, inspect the effective release diff, run the mandatory Functions vendor integrity preflight for the full staging deploy, and run targeted local rules, E2E/journey, tracker, or Functions checks when warranted. Do not duplicate the baseline `npm run release:verify`; the release workflow owns that gate and runs it on the source branch, `main`, and the final bumped release commit.
- Before invoking the release workflow, run the read-only i18n staging sync gate. If it fails only on repairable i18n catalog or changed-key review-ledger blockers, use the `i18n-staging-sync` skill, commit and push the narrow i18n repair, then rerun the gate. If the gate report has `needsCriticalSmoke: true`, run `npm run test:e2e:i18n-critical` as a targeted local check before release.
- Do not use GitHub Actions, GitHub PR checks, or remote CI as a ship gate. Do not inspect, wait for, rerun, or troubleshoot remote CI during `ship`; if evidence is needed, run the equivalent local command and report the local result. GitHub may be used only for required PR/merge mechanics.
- During ship local verification, take over standard Firebase emulator and local E2E dev-server ports when needed: inspect current listeners with `ps`/`lsof`, cancel verified emulator/test/dev runs from this or other local repos, recheck the ports, then continue the selected local check. Hard stop only if a listener is not identifiable as local emulator/test/dev work, cannot be terminated, or still blocks the ship check after cleanup.
- If release verification, staging deploy, or staging validation fails and the blocker is a repairable source, test, workflow, or deploy-tooling issue in the release scope, fix it, run the smallest verification that proves the fix, commit it, push it, and retry from the failed phase. Hard stop when the blocker is unsafe, unrelated, ambiguous, a merge/safety problem, or cannot be fixed and verified within the ship.
- After a full staging deploy body has completed, a callable public-access postcheck timeout or network `request_failed` may be retried only through the callable checker's same-function retry path or by rerunning that callable smoke once. Continue only if the retry returns expected callable JSON responses for every function. Do not retry 403, 404, unexpected response, missing env/config/secrets, billing/minimum-cost, deploy-body, staging QA, or product/runtime failures under this exception.
- Production deploy is out of scope. This skill deploys staging only, including the separate staging admin Hosting site as the final deploy step.
- Run staging validation after a successful staging deploy unless the user explicitly says to skip it. For full staging deploys, the deploy workflow now auto-runs the strict default `staging-qa` gate.

## Execution

1. Load `.agents/workflows/ship.md`.
2. Check `.agents/conventions.md` for repo safety rules.
3. Identify the starting branch, any branch argument, and classify dirty files into intended release changes, non-release support changes, temporary/local-only artifacts, and blockers.
4. Fetch `origin/release-branch`, check out local `release-branch` tracking it, and hard stop if local edits or missing branch state prevent a safe checkout.
5. If a branch argument is present, fetch `origin/<branch>` and merge it into `release-branch` first; if local edits prevent the sync, protect intentional work first and do not hide conflicts.
6. Fetch `origin/main` and merge it into `release-branch` before finalizing release-prep commits; if local edits prevent the sync, protect intentional work first and do not hide conflicts.
7. Commit the intended files on `release-branch` with focused conventional commit message(s), then push the branch.
8. Before invoking release, inspect `git worktree list`; if another worktree holds `main`, delete it when clean and hard stop when it has local changes.
9. Run the root dependency alignment step from `.agents/workflows/ship.md`, inspect `git diff --name-only origin/main...HEAD`, run `npm run i18n:staging-gate -- --base origin/main`, run the mandatory Functions vendor integrity preflight, then run targeted local checks for changed i18n critical paths, rules, user journeys, tracker behavior, or Functions surfaces as required by `.agents/workflows/ship.md`.
10. Run the canonical `release` skill with a `patch` bump from `release-branch`.
    - Use local release verification only. Do not wait for or consult GitHub Actions / PR checks.
11. After the patch release completes and `release-branch` is synced back from `main`, run the canonical `deploy` skill for a full Firebase staging deploy.
12. Treat the deploy workflow's auto-run strict `staging-qa` result as the default post-deploy gate. Rerun it manually only when troubleshooting or when the user asks for a fresh rerun.
13. Add targeted staging validation when the released scope needs it:
   - use `staging-user-journey-verification` for broad auth, dashboard, wallet, tracker, settings, or read/write journey changes
   - use `staging-tracker-verification` for benefit cadence, `userCards`, tracking docs, deterministic tracking IDs, or trigger-generated tracker rows
14. Run `npm run deploy:staging:admin` as the final deploy step so `stage-admin-perkmon` receives the released admin build after the main staging app and validations are clean.
15. Report release version/tag, branch sync status, local verification status, staging deploy status, staging validation status, staging admin Hosting deploy status, commands run, and any blockers or skipped checks.

## Outputs

- Starting branch and committed release-scope changes
- Optional named remote branch pre-sync result
- Remote `main` pre-sync result
- `main` worktree cleanup result before release
- Root dependency alignment result
- Scope-aware local verification diff categories, commands run, skipped checks, and result
- i18n staging sync gate report path, result, fixes, and whether critical mobile smoke was required
- Confirmation that GitHub Actions / PR checks / remote CI were not used as ship gates
- Local emulator/test port takeover actions, canceled PIDs, and final port status when takeover was needed
- Functions vendor integrity preflight result, including any lockfile/vendor refresh commit
- Patch version and semver tag
- Release verification status
- Staging deploy target and result
- Staging validation skills/commands run
- Staging admin Hosting deploy result
- Cleanup status for any temporary staging records
- Final scoped worktree status
