---
name: pr-adversarial-loop
description: Use when the user explicitly invokes $pr-adversarial-loop for an existing pull request or the current implementation branch and wants the work carried through merge rather than receiving a one-pass review.
---

# PR Adversarial Loop

Run the current agent as the coding owner and an independent subagent as the review coordinator until the pull request is merged or safely blocked.

## Invocation

```text
$pr-adversarial-loop [<PR URL or number>] [every <positive minutes> minutes]
```

With a PR argument, require the current branch to own that PR head. Without one, let the coding side create or reuse a PR from the current branch and its existing upstream. Preserve the default PCL and PRL intervals unless an override is supplied.

**REQUIRED SUB-SKILLS:** Use `pcl`, `prl`, `adversarial-review`, and `verify`.

## Authority

Explicit invocation authorizes intended PR-scope commits, pushes, marked PR comments, safe fixes, targeted checks, full verification, and merge after every gate passes. It does not authorize deploys, releases, production changes, sibling-worktree edits, unrelated cleanup, or guessed branch/base selection.

Keep roles separate:

- the current agent owns coding, verification, push, and merge; it never emits reviewer approval
- the review coordinator owns review markers and approval; it never edits implementation files or merges
- a fresh adversarial reviewer performs the independent pass for every new head SHA

Stop instead of self-reviewing when independent subagents are unavailable.

## Execution

Load and follow `.agents/workflows/pr-adversarial-loop.md`. Treat the PR and exact head SHA as shared state; do not rely on hidden local coordination state for correctness.

## Output

Report the PR URL, base, final head, review cycles, findings disposition, targeted and full verification, `GOOD_TO_GO` SHA, merge result, child-agent cleanup, and any blocker or residual risk.
