---
description: How to run a branch-based release flow from the current branch tip to main with semver bump, semver tag creation, and branch sync
---

# Branch Release Workflow

Use this workflow when the task is to prepare a release from the current branch, merge that exact current-branch tip to `main`, apply a semver bump on `main`, create the matching semver tag on the release bump commit, then sync that bump back to the current branch.

If the real goal is a production hotfix from a released tag or a selective cherry-pick release that must skip unrelated current work, use `.agents/workflows/hotfix.md` first instead of hand-rolling that behavior here.

Mobile versioning is out of scope here. iOS/Android version and build-number handling is owned by dedicated mobile release workflows.

Release inclusion is determined by git ancestry, not commit timestamps. A commit that is older than the release time is still excluded if it is not an ancestor of the exact source commit merged into `main` for the release.

## Scope

- Commit and push current branch changes with proper release commit message(s)
- Treat the exact current-branch tip used for release as the required release source commit
- Merge current branch into `main`
- Apply version bump (`patch`/`minor`/`major`) on `main`
- Create and push the matching semver tag (`v<version>`) from the release bump commit on `main`
- Sync `main` back into the original current branch
- End with a clean release scope and both branches pushed

## Prerequisites

- Current branch name is known before switching branches
- Exact release source commit is known before switching branches
- Release starts on the branch that should receive the final `main` sync back
- Release scope is clean before each merge/push step
- Node dependencies are installed at the repo root
- The exact release source commit must become an ancestor of `main` before creating the version bump commit

## Branch Model

This workflow runs in place from the branch where release is started.

- Treat the branch checked out at release start as the canonical release branch for the whole flow.
- Treat the exact `HEAD` on that branch after release-prep commits as the canonical release source commit for the whole flow.
- Do not create a temporary `release/*` or `codex/release-*` branch unless the user explicitly asks for that branch model.
- Do not create a temporary worktree to work around branch locks or local worktree issues during release.
- If release is started from `ops`, the required flow is `ops -> main -> ops`.
- If release is started from some other branch, the required flow is `that branch -> main -> that branch`.

If the release cannot continue in the existing branch/worktree layout, stop and ask the user how to proceed instead of creating new worktrees.

## Release Source Invariant

Before the version bump on `main`, verify that the exact release source commit from the starting branch is already in `main` ancestry.

- Record `RELEASE_SOURCE_HEAD` from the starting branch after the release-prep commit(s) are finalized.
- Do not substitute `main`'s previous tip, a temporary branch, or another branch tip as the release source unless the user explicitly changes the source branch.
- If `git merge-base --is-ancestor "${RELEASE_SOURCE_HEAD}" main` fails, stop. Do not create the version bump commit until the correct source commit is merged into `main`.

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

Run this full gate before merging to `main` and again after the version bump on `main`.
Release must stop immediately if any command in the gate fails.

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
- Staging deploy precheck (`npm run check:deploy:staging`) so release also catches deploy-script blockers such as functions lockfile drift and functions install/lint/build preflight failures before the actual staging deploy step

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
- Create the tag from the release bump commit on `main`, not from the pre-bump merge commit
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

## Canonical Flow (Current Tip -> Main -> Current)

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

2. Run the full release verification gate on the current branch:
```bash
npm run release:verify
```

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

5. Verify the exact current-branch release source is now in `main` ancestry before creating the bump commit:
```bash
git merge-base --is-ancestor "${RELEASE_SOURCE_HEAD}" main
```

   If this check fails, stop. The release would otherwise be cut from the wrong lineage.

6. Run the full release verification gate on `main`:
```bash
npm run release:verify
```

7. Bump version on `main` based on user input, rerun the full release verification gate on the exact release commit, push it, then create and push the semver tag:
```bash
npm version ${BUMP} --no-git-tag-version
npm run release:verify
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

- release source branch and `RELEASE_SOURCE_HEAD`
- current app version
- release tag name and push status
- release verification gate status (`npm run release:verify` on source branch, `main`, and bumped release commit)
- production boundary status: not run here
- branches synced (`current -> main -> current`)
- ancestry verification result for `RELEASE_SOURCE_HEAD`
- commands executed
- final scoped worktree status (must be clean)

## Post-Release Checks

- Confirm the intended app version was used
- Confirm `RELEASE_SOURCE_HEAD` is an ancestor of `main` before the bump commit
- Confirm `main` contains the release bump commit
- Confirm the matching `v<version>` tag exists on `origin`
- Confirm the release verification gate passed on the final bumped release commit
- Confirm production rollout was not run by release
- Confirm current branch has merged latest `main`
- Confirm scoped working tree is clean (`.claude/worktrees/**` excluded)
