---
name: pr-review-loop
description: "Review PRs from a primary review worktree using a bounded interval-based PR agent comment loop, Chinese human summaries, and SHA-bound GOOD_TO_GO signals."
---

# PR Review Loop

Canonical skill doc: `.agents/vendor/agent-workflow-kit/skills/pr-review-loop/SKILL.md`.

Load and follow the canonical skill instructions at `.agents/vendor/agent-workflow-kit/skills/pr-review-loop/SKILL.md`.

**REQUIRED SUB-SKILL:** Use `adversarial-review` for the technical review of every unseen PR head SHA.

Act as the review coordinator rather than the code reviewer. For each new head, delegate a fresh independent pass with only the original requirements, repository instructions, actual base and head SHAs, complete diff, and necessary file context. Do not pass previous findings, verification results, author conclusions, suspected bugs, coder explanations, or proposed fixes into that pass.

After the fresh verdict, independently check whether earlier findings are closed and map the result to the canonical PR markers. Never edit implementation files or merge.

When invoked by `pr-adversarial-loop`, also load `.agents/workflows/pr-adversarial-loop.md` and enforce its full-verification handshake before `HUMAN_SUMMARY` or `GOOD_TO_GO`. A standalone invocation retains the vendored loop's existing verification policy.

Treat complete `AGENT-REVIEW:` marker strings as reserved parser syntax. Each PR comment may contain only its own leading marker; never quote a different complete review marker in that comment's prose.
