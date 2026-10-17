---
description: How to run either a direct main-first branch release or the ship-only staging-first tagged-candidate and post-staging main-promotion flow
---

# Branch Release Workflow

Use this workflow for either of two explicit modes:

- **Direct release (default):** merge the exact current-branch tip to `main`,
  apply a semver bump on `main`, tag the bump commit, then sync that bump back
  to the current branch.
- **Canonical ship staging-first:** prepare and tag the exact bumped candidate
  on `release-branch`, return control to `.agents/workflows/ship.md` for
  immutable staging deployment and validation, then promote the same tag and
  SHA into `main` and run the third release gate there.

Do not silently substitute one mode for the other. Direct `release` remains
main-first; only canonical `ship` may use staging-first.

If the real goal is a production hotfix from a released tag or a selective cherry-pick release that must skip unrelated current work, use `.agents/workflows/hotfix.md` first instead of hand-rolling that behavior here.

Mobile versioning is out of scope here. iOS/Android version and build-number handling is owned by dedicated mobile release workflows.

Release inclusion is determined by git ancestry, not commit timestamps. A commit that is older than the release time is still excluded if it is not an ancestor of the exact source commit merged into `main` for the release.

## Scope

Direct release:

- Commit and push current branch changes with proper release commit message(s)
- Treat the exact current-branch tip used for release as the required release source commit
- Merge current branch into `main`
- Apply version bump (`patch`/`minor`/`major`) on `main`
- Create and push the matching semver tag (`v<version>`) from the release bump commit on `main`
- Sync `main` back into the original current branch
- End with a clean release scope and both branches pushed

Canonical ship staging-first:

- Run the source verification gate on the finalized `release-branch` source
- Apply only the patch bump on `release-branch`
- Run the bumped-candidate verification gate before committing or tagging
- Push the exact candidate commit and annotated semver tag
- Return to `ship` for immutable staging deployment and all required
  validation without checking out or mutating `main`
- After staging passes, merge that exact tag into `main` without squash,
  cherry-pick, rebase, or tag recreation
- Run the third full verification gate on the resulting `main` tree, then push
  `main`
- Leave `release-branch` at the exact staged tag; the next ship performs its
  normal remote-main pre-sync

## Prerequisites

- Current branch name is known before switching branches
- Exact release source commit is known before switching branches
- Release starts on the branch that should receive the final `main` sync back
- Release scope is clean before each merge/push step
- Node dependencies are installed at the repo root
- The exact release source commit must become an ancestor of `main` before creating the version bump commit

## Branch Model

The direct workflow runs in place from the branch where release is started.

- Treat the branch checked out at release start as the canonical release branch for the whole flow.
- Treat the exact `HEAD` on that branch after release-prep commits as the canonical release source commit for the whole flow.
- Do not create a temporary `release/*` or `codex/release-*` branch unless the user explicitly asks for that branch model.
- Do not create a temporary worktree to work around branch locks or local worktree issues during release.
- If release is started from `ops`, the required flow is `ops -> main -> ops`.
- If release is started from some other branch, the required flow is `that branch -> main -> that branch`.

If the release cannot continue in the existing branch/worktree layout, stop and ask the user how to proceed instead of creating new worktrees.

Canonical ship is the narrow exception to the single-worktree branch
transition, not to repository policy: candidate preparation and staging remain
in the existing `release-branch` ship workspace, while post-staging `main`
promotion runs only in the repository's policy-approved primary worktree.
Never remove a worktree, discard WIP, or create a detached `main` substitute
to force promotion.

## Release Source Invariant

Before the version bump on `main`, verify that the exact release source commit from the starting branch is already in `main` ancestry.

- Record `RELEASE_SOURCE_HEAD` from the starting branch after the release-prep commit(s) are finalized.
- Do not substitute `main`'s previous tip, a temporary branch, or another branch tip as the release source unless the user explicitly changes the source branch.
- If `git merge-base --is-ancestor "${RELEASE_SOURCE_HEAD}" main` fails after a squash merge, first verify that `main` and `${RELEASE_SOURCE_HEAD}` have identical trees. If they do, create a no-content ancestry-preserving merge commit with `git merge --no-ff -s ours "${RELEASE_SOURCE_HEAD}" -m "chore: preserve release source ancestry"`, then rerun the ancestry check. This proves the verified source commit is part of the release lineage without changing the already-squashed `main` tree.
- If the trees differ, or if the ancestry check still fails after the preserve-ancestry merge, stop. Do not create the version bump commit until the correct source commit is merged into `main`.

## Release Scope Cleanliness

Use scoped cleanliness checks so agent worktree mounts do not block release:

```bash
git status --porcelain -- . ':(exclude).claude/worktrees/**'
```

Pass condition: command output is empty.

## Handling Non-Release Changes

Not every dirty file under the current worktree should block a release.

Classify changes as follows:

- **Release-relevant runtime/config changes** — production app code in `src/`, Cloud Functions runtime code in `functions/src/`, Firebase rules, release/build scripts, env files, and config files such as `package.json`, `firebase.json`, `vite*.ts`, `tsconfig*.json`, and `eslint.config.js`. These are part of the release surface and must be intentionally reviewed.
- **Non-release support changes** — docs, `exp/` scripts, test files, `e2e/` support/tests, and similar non-production support artifacts. These should not block the release flow when they are the only unrelated local changes.
- **Temporary/local-only artifacts** — local worktree clones, scratch files, debug logs, and similar machine-local artifacts such as `.claude/worktrees/**`. These should be ignored for release decisions and must not be committed as part of normal release prep.

Release rule:

- If only non-release support changes are present in addition to the intended release changes, batch-commit them together before continuing the release flow instead of treating them as blockers.
- If temporary/local-only artifacts are present, exclude them from scoped cleanliness checks and leave them uncommitted.
- If any unrelated runtime/config change is present, stop and explicitly decide whether it belongs in the release before proceeding.

## Release Verification Gate

Select a verification profile before running the canonical flow:

- `standard` (default)
  - Verification passes: source=run, main=run, final=run
  - Direct release order: source -> main -> final bumped commit
  - Canonical ship order: source -> final bumped/tagged candidate ->
    post-staging promoted main
  - Use for direct `release`, canonical `ship`, and every caller other than
    canonical `shipc`.
- `shipc-no-tests` (shipc only)
  - Verification passes: source=skip, main=skip, final=skip
  - Accept only when `.agents/workflows/shipc.md` explicitly invokes the
    user-requested no-test variant while retaining its required dependency,
    i18n, Functions-vendor, staging-capability, deploy, marker, roadmap, Admin,
    and cleanup integrity checks.
  - Patch releases only. Never use for minor, major, hotfix, mobile, or direct
    release invocations.

Represent the selected profile as:

```bash
RELEASE_VERIFY_PROFILE="${RELEASE_VERIFY_PROFILE:-standard}"
case "${RELEASE_VERIFY_PROFILE}" in
  standard|shipc-no-tests) ;;
  *) echo "Unsupported release verification profile: ${RELEASE_VERIFY_PROFILE}"; exit 1 ;;
esac
```

Run the full gate at every pass required by the selected profile. Release must
stop immediately if any required command fails.

This gate is intended to prove that the release commit can move directly into deploy workflows without a separate "did we build everything?" pass.

Required coverage:

- Root lint
- Functions lint
- Root unit/integration test suite (`npm test`)
- Functions unit test suite
- Main app staging build
- Main app production build
- Admin staging build
- Admin production build
- Functions build
- Staging deploy precheck (`npm run check:deploy:staging`) so release also catches deploy-script blockers such as Functions vendor tarball integrity drift, functions lockfile drift, and functions install/lint/build preflight failures before the actual staging deploy step

Canonical command:

```bash
npm run release:verify
```

Expanded command list:

```bash
npm run lint
npm run lint:functions
npm run test
npm run test:functions
npm run build:staging
npm run build:prod
npm run build:admin:staging
npm run build:admin:prod
npm run build:functions
npm run check:deploy:staging
```

## Versioning

For this workflow, version state lives in:

- `package.json` for app semver surfaced in web builds
- `package-lock.json` lockfile alignment for npm

Use `npm version` without git tags:

```bash
npm version patch --no-git-tag-version
npm version minor --no-git-tag-version
npm version major --no-git-tag-version
```

Notes:

- This workflow does not update native version files.
- Native version syncing is handled in iOS/Android release workflows.

## Tagging

Semver releases should create a git tag by default.

- Tag name format: `v<package.json version>` such as `v0.8.14`
- Direct release creates the tag from the release bump commit on `main`, not
  from the pre-bump merge commit.
- Canonical ship creates the tag from the final bumped `release-branch`
  candidate before staging. Post-staging promotion must merge that tag without
  moving or recreating it.
- Use an annotated tag so release history remains readable:

```bash
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"
git tag -a "${TAG}" -m "${TAG}"
git push origin "${TAG}"
```

- If the tag already exists locally or on `origin`, stop and resolve the version collision before continuing
- Creating a GitHub Release page is optional and should happen only when the user explicitly asks for it or repo policy requires it

## Production Boundary

Production rollout is out of scope for this release workflow.

- Do not run any production rollout commands from this workflow.
- Handle production separately with explicit user acknowledgement.
- At the end of release, report that production rollout was not run.

## Canonical Ship Staging-First Flow

Use this split flow only when `.agents/workflows/ship.md` orchestrates it with
an active ship checkpoint, fixed `SHIP_RUN_ID`, fixed
`PERKMON_BUILD_TIME`, and bump type `patch`.

### Part A: Prepare The Exact Tagged Candidate

Stay on a clean, pushed `release-branch`. Record its exact pre-bump
`RELEASE_SOURCE_HEAD`, then run the first full gate:

```bash
test "$(git rev-parse --abbrev-ref HEAD)" = release-branch
RELEASE_SOURCE_HEAD="$(git rev-parse HEAD)"
npm run release:verify
```

Record `release_verify_source=passed` in the ship checkpoint. Determine the
next patch version and hard stop on any local or remote tag collision before
mutating package files. Then bump and run the second full gate:

```bash
npm version patch --no-git-tag-version
npm run release:verify
```

Record `release_verify_bumped=passed` only after the full gate succeeds.
Commit only `package.json` and `package-lock.json`, push `release-branch`,
create the matching annotated `v<version>` tag at that commit, and push the
tag:

```bash
git add package.json package-lock.json
git commit -m "chore: release patch version prep"
git push origin release-branch
VERSION="$(node -p "require('./package.json').version")"
TAG="v${VERSION}"
RELEASE_COMMIT="$(git rev-parse HEAD)"
git tag -a "${TAG}" -m "${TAG}"
git push origin "${TAG}"
```

Require the local and peeled remote tag to equal `${RELEASE_COMMIT}`, update
the ship checkpoint release identity with compare-and-set, and record
`patch_tag=passed`. Return control to `ship` without checking out, merging, or
pushing `main`, and without publishing a GitHub Release.

The candidate commit and tag are immutable after this point. Any deploy or
validation repair that changes tracked source must invalidate this candidate:
apply the fix on `release-branch`, rerun the affected targeted check and both
required pre-staging release gates as applicable, choose a new patch version
and tag, and start a new artifact identity. Never move an existing release tag.

### Part B: Promote Only After Staging Passes

Do not start Part B until canonical `ship` has passed or explicitly skipped
every required backend, Web marker, strict/targeted QA, roadmap, Admin marker,
and Admin verification phase for `${RELEASE_COMMIT}` / `${TAG}`.

Keep the ship workspace on `release-branch` at the exact tag. Use only the
policy-approved primary worktree for `main`. Wait for active worktree commands
to finish, inventory and safely preserve reviewed non-secret WIP, record its
starting branch, then synchronize remote `main`.

Merge the exact tag without rewriting it:

```bash
git fetch origin main --tags
git switch main
git pull --ff-only origin main
git merge --no-edit "${TAG}"
git merge-base --is-ancestor "${RELEASE_COMMIT}" HEAD
test "$(git rev-list -n 1 "${TAG}")" = "${RELEASE_COMMIT}"
```

The merge may fast-forward or create a normal merge commit if `main` advanced
during staging. Squash, cherry-pick, rebase, and tag recreation are forbidden
because they break the staged-candidate identity.

Run the third full gate on the resulting `main` tree, then push and prove the
staged candidate is in remote `main` ancestry:

```bash
npm run release:verify
git push origin main
git merge-base --is-ancestor "${RELEASE_COMMIT}" origin/main
```

Record `release_verify_main=passed` and `main_promotion=passed` only after the
push and remote ancestry proof succeed. Restore the primary worktree's
starting branch and exact WIP inventory. Do not merge post-staging `main` back
into `release-branch`; leaving the ship workspace at the staged tag preserves
checkpoint/artifact identity, and the next ship begins with its normal
`origin/main` pre-sync.

Merge conflicts, tag mismatch, branch protection, ambiguous WIP, an active
primary worktree that cannot be safely yielded, or a failed `main` gate block
promotion but do not invalidate already completed staging evidence. Retain
the checkpoint and resume Part B after the blocker is resolved.

## Canonical Direct Flow (Current Tip -> Main -> Current)

When a direct release is checkpointed by an orchestrator, keep its
`SHIP_RUN_ID` and `PERKMON_BUILD_TIME` unchanged. After each successful
mandatory gate, record it without replacing the gate:

```bash
npm run ship:checkpoint -- phase --repo-root "$PWD" --run-id "$SHIP_RUN_ID" \
  --phase release_verify_source --status passed --command "npm run release:verify"
```

Use phase names `release_verify_source`, `release_verify_main`, and
`release_verify_bumped` for the three invocations below. On failure, record
`failed` and stop. The checkpoint never authorizes skipping a required release
verification after the source or release commit changes.

For `shipc-no-tests`, record all three phases as `skipped` with command/reason
`shipc no-test policy`. Never record a skipped release gate as passed, and
never downgrade an already-passed phase when resuming an existing checkpoint.

Assume `CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)`, `RELEASE_SOURCE_HEAD=$(git rev-parse HEAD)`, and `BUMP` is one of `patch|minor|major`.

Important: `CURRENT_BRANCH` means the branch that was already checked out when the release began. Do not replace it with a newly created temporary release branch unless the user explicitly requested that.

Important: do not create a temporary worktree for any step in this flow. If `main` or another required branch is already checked out elsewhere, or the required worktree is unusable, stop and ask the user before continuing.

1. On current branch, commit all intended release changes with a proper message and push:
```bash
git status --porcelain -- . ':(exclude).claude/worktrees/**'
git add <intended-files-only>
git commit -m "chore: prepare release"
git push origin HEAD
RELEASE_SOURCE_HEAD=$(git rev-parse HEAD)
```

   If the only unrelated dirty files are non-release support changes (docs, `exp/`, tests, `e2e/` support), batch-commit them first so the release can proceed from a clean scoped state. Do not include temporary/local-only artifacts. If no new commit is needed, still record `RELEASE_SOURCE_HEAD=$(git rev-parse HEAD)` before switching branches.

2. Run the full release verification gate on the current branch only for the
   `standard` profile:
```bash
if [[ "${RELEASE_VERIFY_PROFILE}" == "standard" ]]; then
  npm run release:verify
fi
```

For a checkpointed direct run, record `release_verify_source` as passed under
`standard`; for `shipc-no-tests`, record it as skipped.

3. Create and merge a PR from current branch to `main`:
```bash
gh pr create --base main --fill
gh pr merge --squash --delete-branch=false
```

4. Switch to `main` and update it:
```bash
git checkout main
git pull origin main
```

5. Verify the exact current-branch release source is now in `main` ancestry before creating the bump commit. Because this workflow squash-merges the PR, preserve the source ancestry when the squashed `main` tree is identical to the release source:
```bash
if ! git merge-base --is-ancestor "${RELEASE_SOURCE_HEAD}" main; then
  git diff --quiet main "${RELEASE_SOURCE_HEAD}" || {
    echo "main tree differs from RELEASE_SOURCE_HEAD; stop before version bump"
    exit 1
  }
  git merge --no-ff -s ours "${RELEASE_SOURCE_HEAD}" -m "chore: preserve release source ancestry"
fi
git merge-base --is-ancestor "${RELEASE_SOURCE_HEAD}" main
```

   If the final check fails, stop. The release would otherwise be cut from the wrong lineage.

6. Run the full release verification gate on `main` only for the `standard`
   profile:
```bash
if [[ "${RELEASE_VERIFY_PROFILE}" == "standard" ]]; then
  npm run release:verify
fi
```

For a checkpointed direct run, record `release_verify_main` as passed under
`standard`; for `shipc-no-tests`, record it as skipped.

7. Bump version on `main` based on user input, run the full release verification
    gate on the exact final release candidate for the `standard` profile, push
    it, then create and push the semver tag:
```bash
npm version ${BUMP} --no-git-tag-version
if [[ "${RELEASE_VERIFY_PROFILE}" == "standard" ]]; then
  npm run release:verify
fi
git add package.json package-lock.json
git commit -m "chore: release ${BUMP} version prep"
git push origin main
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"
git rev-parse "${TAG}" >/dev/null 2>&1 && echo "tag ${TAG} already exists locally" && exit 1
git ls-remote --exit-code --tags origin "${TAG}" >/dev/null 2>&1 && echo "tag ${TAG} already exists on origin" && exit 1
git tag -a "${TAG}" -m "${TAG}"
git push origin "${TAG}"
```

For a checkpointed direct run under `standard`, record
`release_verify_bumped` only after the final bumped-commit gate passes. For
`shipc-no-tests`, record it as skipped after the version bump is prepared and
before the release commit/tag mutation. After the release commit and tag exist,
update the checkpoint identity with `ship-checkpoint identity` using
compare-and-set from the previously recorded release SHA; later deployment
resume requires this exact release SHA/tag.

8. Switch back to the original branch, merge `main`, and push:
```bash
git checkout "${CURRENT_BRANCH}"
git merge main
git push origin "${CURRENT_BRANCH}"
```

9. Final verification: ensure both branches are synced and worktree is clean.
```bash
git merge-base --is-ancestor "${RELEASE_SOURCE_HEAD}" HEAD
git status --porcelain -- . ':(exclude).claude/worktrees/**'
```

## Reporting

Always report:

- release mode: direct main-first or canonical ship staging-first
- release source branch and `RELEASE_SOURCE_HEAD`
- current app version
- release tag name and push status
- release verification profile, execution order, and source/main/final pass or
  skip status
- production boundary status: not run here
- direct release branch sync (`current -> main -> current`) or staging-first
  promotion result (exact staged tag -> `main`, with `release-branch` left at
  the tag)
- ancestry verification result for `RELEASE_SOURCE_HEAD`
- commands executed
- final scoped worktree status (must be clean)

## Post-Release Checks

- Confirm the intended app version was used
- Direct release: confirm `RELEASE_SOURCE_HEAD` is an ancestor of `main`
  before the bump commit.
- Canonical ship: confirm the exact staged candidate/tag commit is an ancestor
  of remote `main` after staging validation and promotion.
- Confirm `main` contains the release bump commit or exact staged candidate,
  according to mode.
- Confirm the matching `v<version>` tag exists on `origin`
- Confirm the release verification gate passed on the final bumped release
  commit for `standard`, or was explicitly skipped for `shipc-no-tests`
- Confirm production rollout was not run by release
- Direct release: confirm current branch has merged latest `main`.
- Canonical ship: confirm `release-branch` remains at the staged tag; defer
  latest-main sync to the next ship pre-sync.
- Confirm scoped working tree is clean (`.claude/worktrees/**` excluded)
