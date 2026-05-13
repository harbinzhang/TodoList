---
name: release
description: Prepare a branch-based release from the currently checked out branch tip by merging it into main, applying version bump (major/minor/patch), creating the matching semver tag, and ending with a clean worktree
---

# Release Skill

Canonical workflow doc: `.agents/workflows/release.md`

Use this skill when the user asks to cut a release from the current branch, merge that exact starting branch tip into `main`, create the matching semver tag on the release commit, and keep it fully synced with `main`.

If the user actually wants a production hotfix, a tag-based branch start, or a selective cherry-pick release that must skip unrelated current work, use the `hotfix` skill instead of forcing that workflow through `release`.

Release in this repo requires a full verification gate before merge, on `main`, and on the final bumped release commit: root/functions lint, root/functions unit tests, main app staging+prod builds, admin staging+prod builds, Functions build, and the staging deploy precheck (`npm run check:deploy:staging`).

## Safety

- Check `.agents/conventions.md` for production safety rules before running any release command.
- Production rollout is out of scope for this skill and requires an explicit, separate workflow.
- Do not perform store uploads in this skill. This skill is for branch release prep, versioning, and semver tagging only.
- Do not create a temporary release branch by default. Run the workflow on the branch where the release was started, unless the user explicitly asks for a separate branch.
- Do not create a temporary worktree for release work. If the release flow is blocked by branch/worktree state, stop and ask the user how to proceed.
- Do not cut the release from `main` or any other branch unless that branch is the one currently checked out at release start or the user explicitly changes the release source branch.
- Create and push a semver tag (`v<version>`) by default as part of the release flow. Treat a GitHub Release page as optional unless the user explicitly asks for one or repo policy requires it.
- Hard stop if the release verification gate fails at any point. Do not continue to merge, bump, tag, or report the release as deploy-ready.

## Execution

1. Load `.agents/workflows/release.md`.
2. Determine requested bump type: `patch`, `minor`, or `major`.
3. Run the branch-sync, full release verification gate, version-bump, and semver-tag flow from the workflow doc on the starting branch in place.
4. Record the exact release source commit from the starting branch before merging to `main`.
5. Ensure that exact release source commit is an ancestor of `main` before any version bump commit is created.
6. Create and push the release tag from the release bump commit on `main`.
7. Ensure `current branch -> main -> current branch` sync is complete.
8. Ensure the final working tree is clean.
9. Report version/build/tag status, production boundary status, sync status, executed commands, and any remaining manual steps.

## Outputs

- Release flow summary
- Release source branch and source commit
- Version/build/tag status
- Release verification gate status across source branch, `main`, and bumped release commit
- Production boundary status
- Branch sync status (`current -> main -> current`)
- Ancestry verification status for the release source commit
- Commands executed
- Verification status and any follow-up issues
