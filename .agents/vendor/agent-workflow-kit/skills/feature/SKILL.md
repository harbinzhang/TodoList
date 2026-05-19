---
name: feature
description: "Manage a short-lived feature branch and worktree using repo-profile defaults for branch prefix, default branch, worktree root, review, verify, PR, and cleanup. Use when the user asks to open a new feature worktree or branch, move work through plan/design/finish, merge a completed feature, or clean up a merged feature workspace."
---

# Feature Lifecycle

Canonical workflow doc: `workflows/feature.md`.

Before acting, read the consumer repo profile at `.agents/repo-profile.yaml` if it exists. If missing, use the defaults from `profiles/example.repo-profile.yaml`.

This skill owns:
- creating a dedicated feature branch and worktree from the current branch tip
- enforcing `plan -> design -> finish` phase gates
- syncing with the profile default branch before merge
- running the repo's configured review and verification gates
- creating or updating a PR and cleaning up the feature worktree after merge

This skill does not own:
- release/version bump/tagging
- deploys
- store uploads
- force-push or rebase cleanup flows

## Safety

- Always branch from the source branch's local `HEAD`; `git worktree add` creates an independent checkout and must not mutate source worktree files.
- If the source worktree is dirty, emit a visible `DIRTY-SOURCE-EXCLUSION` warning before creating the feature worktree and again in the final report. List modified, staged, and untracked paths and state that they are not carried into the feature worktree.
- A source-branch `git pull --ff-only` is optional hygiene only. Run it only when the source worktree is clean and the source branch has an upstream that can fast-forward. Skip it for dirty worktrees, missing upstreams, or non-fast-forward upstreams.
- Use `repo.branchPrefix` for branch names and `repo.worktreeRoot` for worktree placement.
- Use `repo.defaultBranch` for default-branch sync and PR base unless the workflow says to derive a base from upstream.
- Auto-run `git fetch --prune` and `git worktree prune` during pre-flight.
- Do not auto-stash local changes.
- Stop on branch/worktree collisions, open PR collisions, merge conflicts, failed review, failed verification, failed PR merge, or failed cleanup.

## Execution

1. Load `workflows/feature.md`.
2. Resolve profile values.
3. Identify the requested phase: create/start, `plan`, `design`, or `finish`.
4. Enforce phase order: plan before design, and design before finish.
5. Follow workflow commands, replacing profile variables explicitly.
6. During finish, merge the configured default branch into the feature branch before review, verification, PR merge, and cleanup.
7. Report branch, worktree, source commit, dirty-source exclusion status, profile values used, verification status, PR URL, and cleanup status.
