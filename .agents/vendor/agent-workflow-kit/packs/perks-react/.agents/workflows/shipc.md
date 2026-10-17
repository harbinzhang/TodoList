---
description: Ship through the fixed release-branch workflow exactly like ship while explicitly skipping automated test suites
---

# ShipC Workflow

Use this workflow only for explicit `$shipc` or `/shipc` invocations.

`shipc` is the no-test variant of `.agents/workflows/ship.md`. Follow the
canonical `ship` workflow in full, including its fixed `release-branch` source,
optional named remote-branch sync, remote `main` sync, patch version and tag,
Latest GitHub Release, immutable full Firebase staging deploy, exact
release-tag markers, `origin/dev` roadmap publication, staging Admin deploy,
hosted verification, checkpointing, resume rules, cleanup, and reporting.

The only intentional behavioral difference is the automated-test policy
defined below. When this document does not explicitly override a `ship` step,
the corresponding `.agents/workflows/ship.md` requirement applies unchanged.

Invocation:

```text
$shipc [remote-branch]
```

Treat a provided branch exactly as `ship` does: strip a leading `origin/`,
fetch `origin/<remote-branch>`, and merge it into `release-branch` before the
normal `origin/main` sync. When no branch argument is provided, do not infer
the invocation branch as a source and do not run an optional named-branch
merge. The release source remains exact local `release-branch` tracking
`origin/release-branch`.

## Fixed Boundaries

- Patch releases only.
- Use exact local `release-branch` tracking `origin/release-branch`.
- Deploy the same full staging surfaces as `ship`; do not use the delta deploy.
- Deploy staging only. Never deploy production.
- Do not upload iOS, Android, or Chrome Web Store builds.
- Do not use GitHub Actions, PR checks, or remote CI as ship gates.
- Preserve unrelated dirty files and never commit secrets, env files, scratch
  artifacts, logs, or local worktrees.
- Do not deploy card-asset Hosting unless card assets changed and the user
  explicitly requested that separate surface.

Load these canonical sources:

- `.agents/workflows/ship.md` for the complete ordered ship procedure
- `.agents/workflows/release.md` for the `shipc-no-tests` release profile
- `.agents/workflows/deploy.md` for deploy safety and required postchecks
- `.agents/workflows/i18n-staging-sync.md` for repairable i18n blockers
- `.agents/skills/roadmap/SKILL.md` for roadmap source and hosted verification

## Automated-Test Policy

Set the release verification profile to:

```bash
RELEASE_VERIFY_PROFILE=shipc-no-tests
```

This profile must produce:

```text
Verification passes: source=skip, main=skip, final=skip
```

Skip all automated test-suite execution normally selected by `ship`,
including:

- all three `npm run release:verify` invocations
- targeted Vitest, Functions-test, Firebase-rules-test, Playwright, local E2E,
  journey, i18n critical-smoke, and tracker-test commands
- automatic strict staging QA after the Web deploy
- manual strict/deep staging QA, staging user-journey verification, and staging
  tracker verification

Skipping tests does not skip release or deployment integrity. Still run:

- scoped dirt and release-diff inspection
- root dependency alignment
- the read-only i18n staging catalog/review-ledger gate
- Functions vendor preparation, install, and integrity checks
- staging capability preflight
- branch, ancestry, version, annotated-tag, and GitHub Release checks
- deploy-input digest, parameter, index-readiness, callable-access, artifact,
  and live release-marker checks required by the canonical deploy workflow
- exact `origin/dev` roadmap publication checks
- frozen Admin artifact, hosted Admin marker, and roadmap-SHA verification
- temporary-record and worktree cleanup checks

These are required safety and outcome checks, not substitutes for the skipped
test suites. Report the resulting residual product risk explicitly.

## Execution Overrides

Apply these overrides while following `.agents/workflows/ship.md`.

### Ship Phases 0 Through 2.75

Run unchanged. Resolve an optional source branch only when the invocation
contains one; otherwise skip Ship Phase 0.5.

### Ship Phase 3: Scope-Aware Local Verification

Inspect the effective release diff and run only the non-test integrity gates:

```bash
git diff --name-status origin/main...HEAD
git diff --name-only origin/main...HEAD
npm run i18n:staging-gate -- --base origin/main
npm run functions:prepare
npm run functions:check-vendor-integrity
npm --prefix functions ci --ignore-scripts
git diff --exit-code -- \
  functions/package-lock.json \
  functions/vendor/perkmon-contracts.tgz \
  functions/vendor/perkmon-shared-runtime.tgz
```

Use the canonical `ship` repair rules for i18n or vendor drift. Do not run the
i18n critical smoke or any targeted test selected from the diff. Record the
scope-aware gate as passed only after the retained integrity checks pass, and
record every omitted test lane with `shipc no-test policy` as its reason.

### Ship Phase 3.5

Run the staging capability preflight unchanged. Missing fixed-account, ADC, or
dedicated Admin capability remains a hard stop before release mutation.

### Ship Phase 4: Patch Release

Invoke the canonical release workflow with:

```bash
BUMP=patch
RELEASE_VERIFY_PROFILE=shipc-no-tests
```

Keep the exact release-source ancestry, PR/merge, version bump, annotated tag,
branch sync, and cleanliness requirements. Record
`release_verify_source`, `release_verify_main`, and
`release_verify_bumped` as `skipped` with command/reason
`shipc no-test policy`; do not record a skipped test as passed. On resume,
retain any phase already recorded as passed rather than downgrading it.

### Ship Phases 4.5 And 4.75

Publish and verify the matching GitHub Release as Latest and run the Firestore
index predeploy gate exactly as `ship` specifies.

### Ship Phase 5: Full Staging Deploy

Use the same run ID, build time, frozen inputs, Functions diff base, resume
logic, and full staging deploy as `ship`, but disable only automatic strict
staging QA:

```bash
POST_DEPLOY_STAGING_QA=false \
FUNCTIONS_DIFF_BASE="${SHIP_FUNCTIONS_DIFF_BASE}" \
  npm run deploy:staging -- "${SHIP_DEPLOY_ARGS[@]}"
```

Do not replace this with `npm run deploy:staging:delta`. All deploy-tool
preflights and postchecks other than strict staging QA remain mandatory.

### Ship Phase 6: Staging Validation

Do not run strict QA, deep QA, user-journey verification, or tracker
verification. When the corresponding phase is not already passed from a
resumed checkpoint, record it explicitly:

```bash
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" --run-id "$SHIP_RUN_ID" \
  --phase strict_qa --status skipped --command "shipc no-test policy"
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" --run-id "$SHIP_RUN_ID" \
  --phase deep_qa --status skipped --command "shipc no-test policy"
npm run ship:checkpoint -- phase \
  --repo-root "$PWD" --run-id "$SHIP_RUN_ID" \
  --phase tracker_qa --status skipped --command "shipc no-test policy"
```

The local frozen Web marker and live staging explicit `releaseTag` must still
match the exact annotated tag before continuing.

### Ship Phases 7 Through 9

Publish the exact fetched `origin/dev` roadmap snapshot, deploy the frozen
staging Admin artifact, verify the hosted Admin marker and roadmap SHA, clean
up, and finalize the parent checkpoint exactly as `ship` specifies. The
checkpoint may finalize with the six test phases explicitly skipped:

- `release_verify_source`
- `release_verify_main`
- `release_verify_bumped`
- `strict_qa`
- `deep_qa`
- `tracker_qa`

All other required phases must pass or be skipped only for the same
non-applicability reasons allowed by the canonical `ship` workflow.

## Hard Stops

Use every canonical `ship` hard stop except a failure caused solely by the
absence of intentionally skipped test evidence. In particular, still stop on:

- unsafe or ambiguous dirt, merge conflicts, secrets, or branch/worktree issues
- dependency, i18n, vendor-integrity, staging-capability, or checkpoint failure
- ancestry, version, tag, GitHub Release, or Latest mismatch
- index readiness, deploy body, deploy parameter, callable access, artifact
  digest, build marker, or live release-tag failure
- roadmap publication, Admin deploy, hosted marker/SHA verification, or cleanup
  failure

Do not repair a product failure by adding or running a test inside `shipc`.
Make only a narrow release-scope repair that can be proven by the retained
integrity/outcome checks, otherwise stop and report the blocker.

## Reporting

Report every output required by `ship`, plus:

- confirmation that `shipc` matched the full `ship` branch, release, deploy,
  roadmap, Admin, and cleanup flow
- `RELEASE_VERIFY_PROFILE=shipc-no-tests`
- source/main/final release verification status as `skip/skip/skip`
- every omitted automated test or QA lane and the `shipc no-test policy` reason
- confirmation that full staging deploy, not delta staging deploy, was used
- retained integrity and live-outcome checks with their results
- explicit residual risk from shipping without automated tests
