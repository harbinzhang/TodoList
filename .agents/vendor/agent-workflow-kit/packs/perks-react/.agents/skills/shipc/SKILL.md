---
name: shipc
description: Use when the user explicitly invokes $shipc or /shipc to run the full fixed release-branch patch ship while skipping automated test suites and retaining release, deploy, roadmap, Admin, and live-outcome safety checks.
---

# ShipC

Canonical workflow: `.agents/workflows/shipc.md`

Use `$shipc [remote-branch]` as the no-test counterpart to `ship`. It follows
the canonical `ship` branch, checkpoint, patch release, Latest GitHub Release,
full Firebase staging deploy, release-tag marker, `origin/dev` roadmap,
staging Admin Hosting, hosted verification, cleanup, and reporting behavior.

The only intentional difference from `ship` is that automated test suites are
skipped. Required dependency, i18n, vendor-integrity, staging-capability,
deploy-input, index, callable-access, artifact, release-marker, roadmap, Admin,
and cleanup checks still run.

When `remote-branch` is omitted, behave exactly like `ship`: use
`release-branch` as the release source and do not infer the invocation branch
as an optional merge source. A provided branch is fetched from `origin` and
merged into `release-branch` before the normal `origin/main` sync.

## Safety

- Use exact local `release-branch` tracking `origin/release-branch`.
- Patch only. Never deploy production or upload mobile/store builds.
- Follow `.agents/workflows/ship.md` unless
  `.agents/workflows/shipc.md` explicitly overrides its automated-test steps.
- Use `RELEASE_VERIFY_PROFILE=shipc-no-tests`; source, `main`, and final release
  verification are all explicitly skipped.
- Use the same full immutable staging deploy as `ship`, with
  `POST_DEPLOY_STAGING_QA=false`; do not use delta staging deployment.
- Record skipped release-verification and staging-QA checkpoint phases as
  `skipped`, never `passed`.
- Do not use GitHub Actions, PR checks, or remote CI as ship gates.
- Do not blindly commit dirt or include secrets, env files, scratch files,
  logs, local worktrees, or unrelated runtime/config changes.
- Stop on any retained integrity, release, deploy, marker, roadmap, Admin, or
  cleanup failure.
- Report the residual risk of shipping without automated tests.

## Execution

1. Load `.agents/workflows/shipc.md`, `.agents/workflows/ship.md`, and
   `.agents/conventions.md`.
2. Identify the starting branch and optional branch argument, then classify
   dirt exactly as `ship` requires.
3. Check out fixed `release-branch`, optionally merge the explicitly named
   remote branch, merge `origin/main`, commit intended changes, and push.
4. Run Ship's dependency alignment and retained non-test integrity gates; skip
   all targeted automated test lanes.
5. Run the staging capability preflight unchanged.
6. Run the canonical `release` skill with a `patch` bump and
   `RELEASE_VERIFY_PROFILE=shipc-no-tests`.
7. Publish and verify the exact matching GitHub Release as published,
   non-prerelease, and Latest.
8. Run Ship's index predeploy gate and full immutable staging deploy with
   automatic strict staging QA disabled.
9. Skip and checkpoint strict, deep/journey, and tracker QA while still
   requiring frozen/local/live release-tag and deploy postchecks.
10. Publish the exact fetched `origin/dev` roadmap snapshot, deploy the frozen
    staging Admin artifact, verify its hosted marker and roadmap SHA, clean up,
    and finalize the checkpoint.
11. Report all Ship outputs, skipped test phases, retained checks, and residual
    risk.

## Output

Report the full `ship` outcome, the optional named-branch sync result, patch
tag and GitHub Release, full staging deploy and explicit release-tag evidence,
roadmap/Admin publication and hosted verification, cleanup, every skipped test
phase, and the residual risk accepted by the `shipc` no-test policy.
