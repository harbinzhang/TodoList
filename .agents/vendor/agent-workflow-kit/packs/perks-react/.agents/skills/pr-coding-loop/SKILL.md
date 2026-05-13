---
name: pr-coding-loop
description: "Create and maintain implementation pull requests from a coding-agent worktree using the shared PR agent comment protocol. Use when a coding agent has completed work, needs to push a branch, create or update a PR against the branch's configured upstream remote branch, poll PR comments/review threads, address actionable reviewer feedback, and merge only after a valid AGENT-REVIEW: GOOD_TO_GO signal for the current PR head SHA or after the PR is already merged. Also use for cross-agent PR loops involving Codex, Claude Code, Gemini Code, or other coding tools operating in separate worktrees."
---

# PR Coding Loop

Canonical workflow doc: `.agents/workflows/pr-agent-loop.md`

Use this skill for the implementation side of the PR agent loop. The PR itself is the shared state source; do not use local state files, hidden automation state, or agent-specific memory as the source of truth.

## Parameters

Default invocation shape:

```text
$pr-coding-loop <PR URL or number>
```

- Default loop: run up to 10 coding cycles, waiting 5 minutes between cycles.
- Optional override: `$pr-coding-loop <PR URL or number> every <interval_minutes> minutes`.
- `interval_minutes`, when provided, must be a positive number.
- Do not create a separate Codex automation unless the user explicitly asks for one.

## Role

This skill owns:
- preparing commits in the current coding worktree
- pushing the current branch
- creating or updating a PR whose base comes from the current branch upstream
- polling PR comments and review threads
- addressing actionable reviewer feedback
- merging only after a valid `AGENT-REVIEW: GOOD_TO_GO` marker for the current head SHA

This skill does not own:
- reviewing its own PR for approval
- generating `AGENT-REVIEW:*` markers
- accepting ordinary `LGTM`, `looks good`, or unmarked `good to go` text as merge approval
- merging when the reviewed SHA differs from the latest PR head
- inspecting or modifying sibling worktrees

## Hard Rules

- Resolve the PR base from the current branch upstream. Example: upstream `origin/dev6` means PR base `dev6`.
- If no upstream exists, stop and report the blocker. Do not guess or fall back to another branch.
- Treat `AGENT-REVIEW: GOOD_TO_GO` as valid only when the comment includes the exact latest PR head SHA.
- If the PR head changes after `GOOD_TO_GO`, the approval is stale and the loop must continue.
- Address only actionable comments authored by another participant. Do not act on your own comments as reviewer feedback.
- Before merging, confirm the PR is open, the latest head SHA matches the valid `GOOD_TO_GO`, checks are acceptable under repo policy, and review threads are not blocking.
- Stop polling when the PR is merged, closed, or contains `AGENT-REVIEW: STOP`.

## Execution

1. Load `.agents/workflows/pr-agent-loop.md`.
2. Follow the **Coding Agent Flow** section.
3. Use the shared marker protocol exactly as written.
4. Keep all reports tied to the PR number, branch, upstream-derived base, and latest head SHA.
5. Wait the resolved interval between cycles and report the current cycle count out of 10.

## Outputs

- PR URL and number
- current branch, upstream, and derived PR base
- latest PR head SHA
- comments addressed or skipped with reason
- merge decision and exact `GOOD_TO_GO` SHA used, if merged
