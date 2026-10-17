---
name: release
description: Prepare a branch-based semver release, either with the direct main-first flow or the ship-only staging-first tagged-candidate and post-staging main-promotion flow
---

# Release Skill

Canonical workflow doc: `.agents/workflows/release.md`

Use this skill when the user asks to cut a release from the current branch, merge that exact starting branch tip into `main`, create the matching semver tag on the release commit, and keep it fully synced with `main`.

When orchestrated by canonical `ship`, use the workflow doc's staging-first
path instead: prepare and tag the patch candidate on `release-branch`, return
control for immutable staging deploy and validation, then promote the exact
staged tag to `main`. Do not use that split path for direct `release` calls.

If the user actually wants a production hotfix, a tag-based branch start, or a selective cherry-pick release that must skip unrelated current work, use the `hotfix` skill instead of forcing that workflow through `release`.

The `standard` release verification profile always requires three full gates.
Direct release orders them source -> main -> final bumped commit. Canonical
`ship` orders them source -> final bumped/tagged candidate -> post-staging
promoted main. The `shipc-no-tests` profile skips all three gates and is
permitted only when explicitly orchestrated by `shipc`, whose workflow retains
non-test release, deploy, marker, roadmap, Admin, and cleanup integrity checks.
Direct `release` and canonical `ship` invocations always use `standard`.

## Safety

- Check `.agents/conventions.md` for production safety rules before running any release command.
- Production rollout is out of scope for this skill and requires an explicit, separate workflow.
- Do not perform store uploads in this skill. This skill is for branch release prep, versioning, and semver tagging only.
- Do not create a temporary release branch by default. Run the workflow on the branch where the release was started, unless the user explicitly asks for a separate branch.
- Do not create a temporary worktree to impersonate `main`. Direct releases
  remain in-place. Ship staging-first promotion must use the repository's
  policy-approved primary `main` worktree after staging passes, while the ship
  workspace stays on the exact tagged `release-branch` candidate.
- Do not cut the release from `main` or any other branch unless that branch is the one currently checked out at release start or the user explicitly changes the release source branch.
- Create and push a semver tag (`v<version>`) by default as part of the release flow. Treat a GitHub Release page as optional unless the user explicitly asks for one or repo policy requires it.
- Default `RELEASE_VERIFY_PROFILE` to `standard`. Accept `shipc-no-tests` only
  from the canonical `shipc` workflow and only for a patch release.
- Hard stop if the release verification gate fails at any point. Do not continue to merge, bump, tag, or report the release as deploy-ready.

## Execution

1. Load `.agents/workflows/release.md`.
2. Determine requested bump type: `patch`, `minor`, or `major`.
3. Select the verification profile. Use `standard` unless the canonical
   `shipc` workflow explicitly sets `shipc-no-tests`.
4. For a direct release, run the branch-sync, verification, version-bump, and
   semver-tag flow from the workflow doc on the starting branch in place.
   For canonical `ship`, run its staging-first candidate preparation, return
   control for staging, then run post-staging exact-tag promotion.
5. Record the exact release source commit from the starting branch before merging to `main`.
6. Direct release: ensure the source commit is an ancestor of `main` before
   bumping. Ship staging-first: ensure the exact bumped/tagged candidate is an
   ancestor of `main` before publishing the GitHub Release.
7. Direct release creates the tag from the bump commit on `main`; ship creates
   it from the bumped `release-branch` candidate before staging and never
   rewrites it during promotion.
8. Direct release completes `current branch -> main -> current branch`. Ship
   leaves `release-branch` at the staged tag and promotes that tag to `main`
   after staging; the next ship performs the normal remote-main pre-sync.
9. Ensure the final working tree is clean.
10. Report the verification profile, version/build/tag status, production boundary status, sync status, executed commands, and any remaining manual steps.

## Outputs

- Release flow summary
- Release source branch and source commit
- Version/build/tag status
- Release verification profile and the pass/skip status for source branch,
  `main`, and bumped release commit
- Production boundary status
- Branch sync status (`current -> main -> current`)
- Ancestry verification status for the release source commit
- Commands executed
- Verification status and any follow-up issues
