---
name: feature
description: "Manage the full feature lifecycle in a dedicated git worktree and branch created from the current branch tip, with plan, design, and finish gates, PR squash merge to main, and post-merge branch/worktree cleanup. Use when the user asks to open a new feature worktree or feature branch, spin work off the current branch tip, work through plan/design/finish, finish and merge a feature, clean up merged worktrees, or avoid long-lived drifting worktrees. Also triggers on Chinese requests such as 开一个新的 feature worktree, 从当前分支 tip 拉一条功能线单独做, 做好 plan design finish 然后 merge, or merge 后清理 workspace 和 worktree."
---

# Feature Lifecycle

Canonical workflow doc: `.agents/workflows/feature.md`

Use this skill to run a feature through a short-lived branch/worktree lifecycle instead of keeping long-lived semi-synced worktrees around.

This skill owns:
- creating a dedicated feature branch and worktree from the current branch tip
- enforcing `plan -> design -> finish` phase gates
- syncing the feature branch with `origin/main` before merge via merge, not rebase
- running `re` and `verify` before merge
- squash-merging the PR into `main`
- deleting the local worktree, local branch, and remote branch after merge

This skill does not own:
- release/version bump/tagging
- deploys
- store uploads
- force-push or rebase cleanup flows

## Safety

- Always branch the feature from the source branch's local HEAD (the current branch tip). `git worktree add` creates an independent checkout and does not mutate the source worktree, so dirty files in the source worktree stay in place untouched regardless of cleanliness.
- The source-branch `git pull --ff-only` is an optional hygiene step that only runs when the source worktree is clean AND the source branch has an upstream that can fast-forward. Skip it in every other case: dirty worktree, no upstream, or an upstream that cannot fast-forward. Skipping the pull is never a hard stop because the feature already branches from local HEAD.
- Never stash, reset, or checkout over files in the source worktree.
- When the source worktree is dirty, emit a visible `DIRTY-SOURCE-EXCLUSION` warning that lists every dirty path (modified, staged, and untracked) and states clearly that those changes are NOT carried into the feature worktree — they stay only in the source worktree. Warn during pre-flight (so the user can cancel before the worktree is created) and again in the final report. Do not proceed silently.
- Auto-run `git fetch --prune` and `git worktree prune` as part of normal hygiene.
- Do not auto-stash local changes.
- Do not continue through conflicts in the `origin/main` merge performed during `finish`, failed `re`, failed `verify`, or failed PR squash. A non-fast-forward source-branch pull is not a hard stop — it just means the optional pull is skipped.
- Do not reuse an existing feature branch, feature worktree, or open PR for the same branch. Stop and report the collision instead.

## Execution

1. Load `.agents/workflows/feature.md`.
2. Identify the requested phase: create/start, `plan`, `design`, or `finish`.
3. Follow the canonical branch naming and worktree location rules from the workflow doc.
4. Enforce phase order:
   - Do not enter `design` before `plan` is settled.
   - Do not enter `finish` before design decisions are settled.
5. Before `finish`, merge `origin/main` into the feature branch and resolve no conflicts automatically beyond safe command retries. Stop on any real conflict.
6. Run `re`, then `verify`. If either fails, stop without creating or merging a PR.
7. Create or update a PR to `main`, squash-merge it, and only then run cleanup.
8. Remove the feature worktree, local feature branch, and remote feature branch, then prune worktrees.
9. Return to the main workspace and report branch/worktree/PR/cleanup status.

## Outputs

- feature branch name and worktree path
- source branch and source commit used to create the feature branch
- phase completed and next required phase
- `origin/main` sync status before merge
- `re` status
- `verify` status
- PR status and URL
- local/remote cleanup status
- final worktree health summary
