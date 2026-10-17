---
name: ship
description: Use when preparing an exact patch-tagged candidate on release-branch, fully validating it on staging, promoting the same tag/SHA to main, publishing Latest, and reconciling ship-created support fixes to dev.
---

# Ship Skill

Canonical workflow doc: `.agents/workflows/ship.md`

Use this skill when the user wants the fixed `release-branch` branch taken all
the way through a staging-first patch ship: optionally sync a named remote
branch into `release-branch`, sync `release-branch` from remote `main`, commit
the intended branch changes, run scope-aware local-only verification plus the
pre-staging i18n sync gate, prepare and tag an exact patch candidate on
`release-branch`, freeze and deploy that immutable candidate to staging,
complete all required Web, deep/tracker, roadmap, and Admin validation, then
promote the same tagged commit to `main`, publish the matching GitHub Release
as Latest, and reconcile support-only commits created during the ship back to
`dev` through a minimal PR.

If the user wants to fix production from a released tag, cherry-pick only selected commits, or bypass unrelated in-progress work on the current branch, use the `hotfix` skill instead of `ship`.

All ship runs use the exact branch named `release-branch` as the release source. At the start of the workflow, fetch `origin/release-branch`, check out the local `release-branch` that tracks it, and hard stop if that branch is missing or cannot be checked out safely. If the invocation includes a branch argument, for example `$ship feature/my-branch`, treat it as a remote source branch to merge into `release-branch` before the normal ship flow. After that optional branch sync, the first normal ship step is still syncing `release-branch` from remote `main`.

This skill orchestrates the canonical `i18n-staging-sync`, `release`, `deploy`,
`staging-qa`, `staging-user-journey-verification`,
`staging-tracker-verification`, and `roadmap` skills. Use the release
workflow's ship-only staging-first candidate and promotion path; direct
`release` calls retain their existing main-first behavior. Load those
skill/workflow docs as needed instead of duplicating their details.

## Safety

- Patch only. If the user asks for `minor`, `major`, mobile store upload, or production rollout, use the dedicated release/deploy/mobile release workflows instead.
- Do not blindly commit every dirty file. Review `git status` and diffs, commit intended release-scope changes, and exclude secrets, env files, scratch files, logs, local worktrees, and unrelated runtime/config changes.
- Do not use an arbitrary starting branch as the release source. Ship must happen from the exact local branch `release-branch` tracking `origin/release-branch`.
- When a branch argument is provided, fetch `origin/<branch>` and merge it into `release-branch` before the remote `main` sync. Hard stop if the remote branch does not exist or cannot be merged cleanly.
- Before final release-prep commits, fetch `origin/main` and merge it into `release-branch` so conflicts surface before the patch release flow tries to sync back to `main`.
- Do not check out or mutate `main` before staging validation completes.
  `release-branch` stays checked out in the ship workspace through candidate
  preparation, deploy, and all staging validation. Promote only afterward,
  from the repository's primary worktree when repository policy reserves
  `main` for that worktree. Never remove another worktree or discard its
  changes merely to make promotion possible.
- Before preparing the candidate, run the scope-aware local verification gate
  from `.agents/workflows/ship.md`: align root dependencies with `npm install`,
  inspect the effective release diff, run the mandatory Functions vendor
  integrity preflight for the full staging deploy, and run targeted local
  rules, E2E/journey, tracker, or Functions checks when warranted. Do not
  duplicate the baseline `npm run release:verify`; the release workflow's
  ship-only staging-first path runs it on the source and final bumped
  candidate before staging, then on the promoted `main` tree after staging.
- Before any release commit/tag mutation, create or resume the machine-readable
  ship checkpoint and run `npm run ship:preflight:staging -- --run-id <id>`.
  Missing fixed-account, ADC, or dedicated Admin capability is a hard stop.
- Every build and deploy command in one ship run must use the same run ID and
  checkpoint build time. `--resume` may reuse only verified frozen artifacts;
  it must never rebuild or create a new build ID.
- Bind the prepared backend/config/rules input digest before deploy and
  reverify it before every Firebase CLI body. Resume must hard stop if any
  deploy-relevant file changed while the Git SHA stayed the same.
- Before invoking the release workflow, run the read-only i18n staging sync gate. If it fails only on repairable i18n catalog or changed-key review-ledger blockers, use the `i18n-staging-sync` skill, commit and push the narrow i18n repair, then rerun the gate. If the gate report has `needsCriticalSmoke: true`, run `npm run test:e2e:i18n-critical` as a targeted local check before release.
- Do not use GitHub Actions, GitHub PR checks, or remote CI as a ship gate. Do not inspect, wait for, rerun, or troubleshoot remote CI during `ship`; if evidence is needed, run the equivalent local command and report the local result. GitHub may be used only for required PR/merge mechanics and GitHub Release publication/verification.
- Publishing and verifying the GitHub Release is required release metadata,
  not a CI gate. Do not mark a candidate Latest before staging validation and
  `main` promotion pass. After promotion, hard stop unless the exact staged tag
  resolves to the staged release commit, has a published non-prerelease GitHub
  Release, and is marked Latest.
- Do not infer or inject `releaseTag` from `package.json`. Before staging deploy, require `release-branch` `HEAD` to be the exact semver-tagged release commit. After the deploy build, require both `dist/sw-build-meta.js` and the live staging marker to contain that explicit tag.
- During ship local verification, take over standard Firebase emulator and local E2E dev-server ports when needed: inspect current listeners with `ps`/`lsof`, cancel verified emulator/test/dev runs from this or other local repos, recheck the ports, then continue the selected local check. Hard stop only if a listener is not identifiable as local emulator/test/dev work, cannot be terminated, or still blocks the ship check after cleanup.
- If release verification, staging deploy, or staging validation fails and the blocker is a repairable source, test, workflow, or deploy-tooling issue in the release scope, fix it, run the smallest verification that proves the fix, commit it, push it, and retry from the failed phase. Hard stop when the blocker is unsafe, unrelated, ambiguous, a merge/safety problem, or cannot be fixed and verified within the ship.
- Before the staging deploy starts, rely on the canonical deploy workflow's manifest-driven Functions parameter preflight. It may write `false` only for an explicitly allowlisted default-off deploy-safety boolean when the generated manifest also declares `default: false`; unknown params, secrets, duplicates, invalid values, and any request to infer `true` remain hard-stop blockers.
- After a full staging deploy body has completed, a callable public-access postcheck timeout or network `request_failed` may be retried only through the callable checker's same-function retry path or by rerunning that callable smoke once. Continue only if the retry returns expected callable JSON responses for every function. Do not retry 403, 404, unexpected response, missing env/config/secrets, billing/minimum-cost, deploy-body, staging QA, or product/runtime failures under this exception.
- Production deploy and production roadmap publication are out of scope. This skill deploys staging only, publishes the roadmap snapshot only to the staging Firestore project, and deploys the separate staging admin Hosting site as the final deploy step.
- Run staging validation after a successful staging deploy unless the user explicitly says to skip it. For full staging deploys, the deploy workflow now auto-runs the strict default `staging-qa` gate.
- Publish the roadmap from an exact, clean detached checkout of the fetched `origin/dev` SHA. Never publish release-branch, main, a feature branch, a dirty worktree, or an inferred SHA as the hosted roadmap source.
- Hard stop if the strict hosted roadmap check, snapshot export, staging Firestore write, or temporary publication-worktree cleanup fails. Do not deploy staging admin Hosting with a stale or failed roadmap publication.
- Freeze a dev reconciliation baseline after the named-branch and remote-main
  sync but before ship-specific commits. After release publication, exclude
  the version-prep commit, skip patches already on `dev`, create a minimal PR
  only for support-only paths, and hard stop on runtime or unclassified
  changes. Never merge the whole release/tag lineage into `dev`.

## Execution

1. Load `.agents/workflows/ship.md`.
2. Check `.agents/conventions.md` for repo safety rules.
3. Identify the starting branch, any branch argument, and classify dirty files into intended release changes, non-release support changes, temporary/local-only artifacts, and blockers.
4. Fetch `origin/release-branch`, check out local `release-branch` tracking it, and hard stop if local edits or missing branch state prevent a safe checkout.
5. If a branch argument is present, fetch `origin/<branch>` and merge it into `release-branch` first; if local edits prevent the sync, protect intentional work first and do not hide conflicts.
6. Fetch `origin/main` and merge it into `release-branch` before finalizing release-prep commits; if local edits prevent the sync, protect intentional work first and do not hide conflicts.
7. Commit the intended files on `release-branch` with focused conventional commit message(s), then push the branch.
8. Run the root dependency alignment step from `.agents/workflows/ship.md`,
   inspect `git diff --name-only origin/main...HEAD`, run
   `npm run i18n:staging-gate -- --base origin/main`, run the mandatory
   Functions vendor integrity preflight, then run targeted local checks for
   changed i18n critical paths, rules, user journeys, tracker behavior, or
   Functions surfaces as required by `.agents/workflows/ship.md`.
9. Use the canonical `release` workflow's ship-only staging-first preparation
   path on `release-branch`: run the source gate, apply the `patch` bump, run
   the final candidate gate, commit and push it, create and push its annotated
   semver tag, and record the exact candidate SHA/tag. Do not check out or
   merge `main` yet.
10. Verify the local and remote annotated tag both peel to
    `release-branch` `HEAD`. Do not publish the GitHub Release yet.
11. Confirm `HEAD` is still the exact release tag, update the checkpoint
    release identity, then run the canonical `deploy` skill with
    `--run-id <id>` for a full Firebase staging deploy. Require its frozen
    artifact digest and built/live release markers to match the exact tag.
12. Treat the deploy workflow's auto-run strict `staging-qa` result as the default post-deploy gate. Rerun it manually only when troubleshooting or when the user asks for a fresh rerun.
13. Add targeted staging validation when the released scope needs it:
   - use `staging-user-journey-verification` for broad auth, dashboard, wallet, tracker, settings, or read/write journey changes
   - use `staging-tracker-verification` for benefit cadence, `userCards`, tracking docs, deterministic tracking IDs, or trigger-generated tracker rows
14. Fetch `origin/dev`, create a clean temporary detached worktree at its exact SHA, install its root and Functions dependencies, and run `npm run roadmap:publish:staging -- --sha <origin/dev-sha>`. Remove the clean temporary worktree after the publication succeeds.
15. Run `npm run deploy:staging:admin -- --run-id <id>` as the final deploy
    step only after backend, Web marker, strict/deep/tracker QA, and roadmap
    phases are passed or explicitly skipped. A failed Admin deploy may be
    redeployed only once with `--resume`.
16. Run
    `npm run staging:verify:admin -- --run-id <id> --expected-roadmap-sha <sha>`.
17. After all staging surfaces and validation pass, use the canonical release
    workflow's ship-only promotion path in the primary worktree: synchronize
    remote `main`, merge the exact annotated candidate tag without rewriting
    it, run `npm run release:verify` on the resulting `main` tree, and push
    `main`. Keep the ship workspace on `release-branch`.
18. Publish or update the matching GitHub Release as a published
    non-prerelease Latest release only after the `main` promotion gate passes,
    then verify GitHub resolves that tag as Latest.
19. Run the dev reconciliation planner against the frozen pre-ship baseline
    and release commit. Record `skipped` when no patch is missing; otherwise
    create a minimal `dev` PR from the ordered support commits, follow
    `pr-coding-loop`, merge only after its exact-head gate passes, and require
    the post-merge planner to return `skip`.
20. Record cleanup and finalize the checkpoint only after every required phase
    passes; failed runs retain their frozen artifacts for safe resume.
21. Report release version/tag, run ID/checkpoint, artifact digests/build IDs,
    remote tag commit, GitHub Release URL/Latest status, branch sync and local
    verification, staging deploy/validation, roadmap/Admin verification,
    cleanup, commands, and blockers/skips.

## Outputs

- Starting branch and committed release-scope changes
- Optional named remote branch pre-sync result
- Remote `main` pre-sync result on `release-branch`
- Confirmation that no `main` checkout or mutation occurred before staging
- Root dependency alignment result
- Scope-aware local verification diff categories, commands run, skipped checks, and result
- i18n staging sync gate report path, result, fixes, and whether critical mobile smoke was required
- Confirmation that GitHub Actions / PR checks / remote CI were not used as ship gates
- Local emulator/test port takeover actions, canceled PIDs, and final port status when takeover was needed
- Functions vendor integrity preflight result, including any lockfile/vendor refresh commit
- Patch version and semver tag
- Ship run ID, checkpoint path, frozen build time, and Web/Admin artifact digests
- Remote annotated-tag target commit and exact-`HEAD` result
- GitHub Release URL, published/non-prerelease status, and Latest status
- Local `dist/sw-build-meta.js` and live staging explicit `releaseTag` result
- Release verification status and order: source candidate, bumped/tagged
  candidate, then post-staging promoted `main`
- Staging deploy target and result
- Functions deploy-param preflight result and any safe default-off value added to the ignored staging env file
- Staging validation skills/commands run
- Staging roadmap publication command, exact `origin/dev` SHA, strict check result, Firestore write result, and temporary worktree cleanup
- Staging admin Hosting deploy result
- Hosted staging roadmap route and published-SHA verification
- Exact staged tag/SHA promotion result in the primary `main` worktree
- Dev reconciliation baseline, planner reports, candidate/excluded commits,
  PR URL/merge result, and post-merge proof
- Cleanup status for any temporary staging records
- Final scoped worktree status
