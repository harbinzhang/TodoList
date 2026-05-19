---
name: pr-review-loop
description: "Use when a review agent receives a PR URL and should run a bounded PR discussion loop from the primary review worktree across separate coding tools such as Codex, Claude Code, Gemini Code, or other coding tools."
---

# PR Review Loop

Canonical workflow doc: `workflows/pr-agent-loop.md`.

Use this skill for the reviewer side of the PR agent loop. The review agent uses GitHub PR state and fetched PR heads as the source of truth; it must not infer review status from unrelated local worktree dirt.

## Parameters

Default invocation:

```text
$pr-review-loop <PR URL or number>
```

- Default loop: run up to 10 review cycles, waiting 10 minutes between cycles.
- Optional override: `$pr-review-loop <PR URL or number> every <interval_minutes> minutes`.
- `interval_minutes`, when provided, must be a positive number.
- Do not create a separate Codex automation unless the user explicitly asks for one.

## Role

This skill owns:
- fetching and reviewing the latest PR head
- posting marked findings and discussion comments
- applying a maintainability-first review bar instead of proposing narrow or hacky patches
- asking the implementation agent to evaluate findings with `What do you think?`
- generating a Chinese human-review summary when the PR appears safe
- posting `AGENT-REVIEW: GOOD_TO_GO` only after human approval

This skill does not own:
- merging the PR
- editing implementation files in the coding worktree
- posting `GOOD_TO_GO` before human approval
- approving a stale head SHA
- repeating already-fixed findings without re-fetching the latest head

## Hard Rules

- Always fetch and review the latest PR head for each cycle.
- Review the PR diff against its actual base branch from GitHub, not against an assumed default branch.
- Prefer maintainable fixes over narrow patches. Do not suggest one-off workarounds unless they are explicitly bounded, documented, and safe.
- Challenge hidden coupling, duplicated logic, broad fallback behavior, weak validation, stale compatibility paths, and migration debt that would raise future risk.
- Findings should explain the long-term maintainability risk as well as the immediate bug or behavior gap.
- Bundle Check is informational only. Mention its state in the human summary, but do not wait for queued Bundle Check runs and do not block `HUMAN_SUMMARY` or `GOOD_TO_GO` on it.
- Before posting `HUMAN_SUMMARY` or `GOOD_TO_GO`, confirm GitHub mergeability for the current head and run `git diff --check` on the fetched PR diff.
- A default invocation is a real polling loop, not a single review pass. Continue until a stop condition fires or 10 cycles complete.
- Post findings with `AGENT-REVIEW: FINDING` or `AGENT-REVIEW: DISCUSSION`.
- End each finding or discussion comment with the exact sentence `What do you think?`
- Posting `AGENT-REVIEW: FINDING` or `AGENT-REVIEW: DISCUSSION` is not a stop condition. After posting findings, wait the resolved interval, re-fetch the latest PR head, and continue the loop.
- A clean technical review is not enough to post `GOOD_TO_GO`. First post `AGENT-REVIEW: HUMAN_SUMMARY` and wait for explicit human approval.
- `AGENT-REVIEW: GOOD_TO_GO` must include the exact reviewed PR head SHA.
- Loop mode must stop after 10 cycles even if no other stop condition has fired.
- Stop the current loop after posting `AGENT-REVIEW: HUMAN_SUMMARY` for a safe current head; that one-cycle exit is intentional because the next step is explicit human approval before `GOOD_TO_GO`.
- After posting `AGENT-REVIEW: HUMAN_SUMMARY` to the PR, paste the full same summary directly in the current conversation. Do not only provide a PR comment link.
- Stop polling after posting valid `GOOD_TO_GO`, when the PR is merged or closed, or when instructed with `AGENT-REVIEW: STOP`.

## Execution

1. Load `workflows/pr-agent-loop.md`.
2. Follow the **Review Agent Flow** section.
3. Use the shared marker protocol exactly as written.
4. Keep all review reports tied to the PR number, base branch, latest head SHA, and whether human approval has been received.
5. If the current cycle posted findings/discussions and no stop condition fired, wait the resolved interval and continue from fresh PR metadata instead of ending the invocation.
6. Wait the resolved interval between non-terminal cycles and report the current cycle count out of 10.

## Outputs

- current PR URL and number
- fetched base branch and head SHA
- findings posted, skipped, or resolved
- readable Chinese human-review summary pasted directly in the current conversation when ready
- maintainability and design-risk assessment in the human summary
- `GOOD_TO_GO` status and reviewed SHA, if human approved
