---
name: hotfix
description: Prepare a short-lived production hotfix from a released tag, optionally cherry-pick selected commits, run release verification, feed the fix through the normal patch release flow on main, and clean up the hotfix branch/worktree
---

# Hotfix Skill

Canonical workflow doc: `.agents/workflows/hotfix.md`

Use this skill when the user asks to directly fix production, start from a released tag instead of the current branch tip, selectively cherry-pick one or more reviewed commits into a production-safe branch, or skip unrelated in-progress work that should not ship.

If the user says "fix production", "ship only these commits", "skip current changes", "start from the release tag", or "cherry-pick to prod", route here instead of the normal `release` or `ship` skills.

## Inputs

- `tag` (optional) — the production base tag such as `v0.8.26`; default is the latest semver tag after fetching `origin`
- `source_branch` (optional) — the remote or local branch that contains candidate commits to inspect or cherry-pick
- `pick_commits` (optional, ordered) — the exact commit SHAs to cherry-pick in order
- `slug` (optional) — a short task name used to derive the hotfix branch and worktree names

## Defaults

- Resolve `tag` to the latest semver tag from `git tag --list 'v[0-9]*' --sort=-v:refname`
- If `pick_commits` is omitted, make the minimal hotfix edits directly on the hotfix branch
- If `slug` is omitted, derive a lowercase hyphen-case slug from the task
- If the user names both a release tag and a commit, default to `release tag + that commit's diff only`, not `release tag + every commit in between`

## Direct Commit Semantics

- If the user asks for a hotfix such as "base `v0.8.26` plus commit `11f927cc`", interpret that as "start from `v0.8.26`, cherry-pick `11f927cc`, and release/tag the new hotfix commit".
- Do not tag or release the original source-branch commit when that commit sits after unrelated intermediate commits.
- The resulting release/tag should point to the new cherry-picked hotfix commit created on top of the release base, not to the original commit object on the source branch.

## Safety

- Production deploy is out of scope for this skill. After the patch release completes, use the dedicated `deploy` workflow and explicit production acknowledgement for rollout.
- Do not start the hotfix from the current branch or `main` by default. Start from the resolved release tag unless the user explicitly overrides the base.
- Do not merge an entire dev or feature branch into the hotfix branch. Only cherry-pick explicitly reviewed commits or make direct hotfix edits.
- If cherry-picking, use `git cherry-pick -x` and preserve the user-provided commit order.
- If the user specified a release tag plus a target commit, do not treat the commits between them as implicitly included. Only include explicitly requested commits.
- Do not cherry-pick merge commits by default. Hard stop on merge commits, conflicts, or signs that the selected commit depends on unpublished omitted commits.
- Hard stop if `npm run release:verify` fails or if the canonical `release` workflow cannot complete.
- After a successful patch release, clean up the hotfix worktree and local/remote hotfix branch so `main` and the new patch tag are the only source of truth.

## Execution

1. Load `.agents/workflows/hotfix.md`.
2. Resolve `tag`, `slug`, optional `source_branch`, and optional ordered `pick_commits`.
3. Fetch origin tags/refs and create a dedicated hotfix branch/worktree from the resolved tag.
4. If `pick_commits` is present, inspect each commit, verify it is not a merge commit, and cherry-pick it with `-x` in order. If the user gave a release tag plus a single target commit, still create a new hotfix commit by cherry-picking that commit onto the release base instead of tagging the original source-branch commit.
5. If `pick_commits` is absent, implement the smallest production-safe fix directly on the hotfix branch.
6. Run the smallest relevant verification for the changed scope, then run `npm run release:verify`.
7. Invoke the canonical `release` workflow with a `patch` bump from the hotfix branch so the fix flows `hotfix -> main -> hotfix`.
8. Delete the hotfix worktree and the local/remote hotfix branch after the release succeeds.
9. Report the hotfix base tag, picked commits or direct edits, verification status, new patch tag, cleanup status, and explicit note that production deploy was not run.

## Outputs

- Resolved hotfix base tag and base commit
- Hotfix branch name and worktree path
- Source branch and picked commits, or a direct-edit hotfix summary
- Requested source commit and resulting cherry-picked hotfix commit, when the user asked for `release + commit`
- Cherry-pick provenance status (`-x` preserved)
- Relevant pre-release verification and full `npm run release:verify` status
- Resulting patch tag and `main` sync status
- Hotfix cleanup status for local worktree, local branch, and remote branch
- Production boundary status: deploy not run here
