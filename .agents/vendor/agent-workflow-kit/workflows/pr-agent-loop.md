---
description: Shared PR comment protocol for coding and review agents working across independent worktrees and agent runtimes
---

# PR Agent Loop

Use this workflow when a coding agent and a review agent coordinate through a GitHub pull request. It is platform-neutral and works for Codex, Claude Code, Gemini Code, or other tools as long as they can read and write PR comments.

The PR is the shared state source. Do not rely on local state files, hidden agent memory, or runtime-specific automation state for correctness.

Use these read-only helpers when available:

```bash
npm run agent-pr:status -- <pr-url-or-number>
npm run agent-pr:ready -- <pr-url-or-number>
```

`agent-pr:status` summarizes markers, latest head SHA, mergeability, status checks, unresolved review threads, blockers, and warnings. `agent-pr:ready` performs the same checks and exits non-zero unless the PR has a valid `AGENT-REVIEW: GOOD_TO_GO` for the latest head, GitHub reports `mergeStateStatus: CLEAN`, no merge conflict is reported, present status checks are acceptable, and no review-thread blockers remain. An empty status-check rollup (no CI attached) is a warning, not a hard blocker; verify that the target branch intentionally has no attached CI or rely on branch protection / GitHub mergeability to block protected-check gaps. Bundle Check is the sole informational check exception: queued or failed Bundle Check runs should be mentioned in summaries but must not block review progress, `HUMAN_SUMMARY`, `GOOD_TO_GO`, or merge readiness.

## Loop Parameters

Coding-agent loop mode defaults to a bounded polling loop:

```text
$pr-coding-loop <PR URL or number>
```

- Default coding interval: 5 minutes.
- Default cap: 10 coding cycles per invocation.
- Optional override: `$pr-coding-loop <PR URL or number> every <interval_minutes> minutes`.
- `interval_minutes`, when provided, must be a positive number.
- A coding cycle means: fetch PR metadata, inspect marker comments, address actionable review comments when present, push fixes if needed, and report status.

Review-agent loop mode defaults to a bounded polling loop:

```text
$pr-review-loop <PR URL or number>
```

- Default review interval: 10 minutes.
- Default cap: 10 review cycles per invocation.
- Optional override: `$pr-review-loop <PR URL or number> every <interval_minutes> minutes`.
- `interval_minutes`, when provided, must be a positive number.
- A cycle means: fetch PR metadata, fetch the latest PR head, review the current diff against the actual base branch, then post any new current marker comments or the human summary.
- A default review invocation is a polling loop, not a one-shot review. After posting `AGENT-REVIEW: FINDING` or `AGENT-REVIEW: DISCUSSION`, keep the invocation alive, wait the resolved interval, and repeat from fresh PR metadata unless a stop condition fired.
- Wait the resolved interval between cycles. Do not create a background scheduler or Codex automation unless the human explicitly asks for one.
- Stop conditions always take precedence over the 10-cycle cap.
- Posting `AGENT-REVIEW: HUMAN_SUMMARY` for a safe current head stops the current loop invocation; this is an intentional human-approval handoff, not a failed loop. Wait for human approval or a new invocation instead of reposting the same summary.

## Shared Protocol

Allowed markers:

- `AGENT-CODING: STATUS`
- `AGENT-CODING: ADDRESSED`
- `AGENT-CODING: QUESTION`
- `AGENT-REVIEW: FINDING`
- `AGENT-REVIEW: DISCUSSION`
- `AGENT-REVIEW: HUMAN_SUMMARY`
- `AGENT-REVIEW: GOOD_TO_GO`
- `AGENT-REVIEW: STOP`

Rules:

- Treat ordinary `LGTM`, `looks good`, and unmarked `good to go` text as discussion only.
- Treat `AGENT-REVIEW: GOOD_TO_GO` as valid only when it includes the exact reviewed PR head SHA.
- Any new PR commit after `GOOD_TO_GO` invalidates that approval.
- Treat marker prefixes as agent roles; do not infer the role from GitHub author login. A review agent and coding agent may post through the same account, so `AGENT-REVIEW:*` comments remain authoritative even when the author matches the coding account.
- Treat Bundle Check as informational only. Do not wait for queued Bundle Check runs before posting findings, `AGENT-REVIEW: HUMAN_SUMMARY`, or `AGENT-REVIEW: GOOD_TO_GO`.
- Include PR number, head SHA, and role marker in status comments when the loop state changes.
- Do not post duplicate status noise when there is no new information.

Recommended comment shapes:

```text
AGENT-REVIEW: FINDING

[P1] path/to/file.ts:42
This can retry after partial success and duplicate the write.

Reviewed head: <sha>
What do you think?
```

```text
AGENT-CODING: ADDRESSED

Addressed <comment-url-or-thread-id> in <sha>.
Reasoning: <short explanation>.
Verification: <commands or not run with reason>.
```

```text
AGENT-REVIEW: HUMAN_SUMMARY

Reviewed head: <sha>
PR: <url>
Recommendation: <merge | wait | block>
Risk level: <low | medium | high>
Bundle Check: <passed | queued | failed | missing> (informational only)

### 变更目的
<Chinese summary>

### 输入 / 触发
<Chinese summary>

### 输出 / 行为变化
<Chinese summary>

### 改动范围
<Chinese summary>

### 主要风险
<Chinese summary>

### 可维护性
<Chinese summary>

### 设计风险
<Chinese summary>

### 验证结果
<Chinese summary>

### 需要人工确认
<Chinese summary>
```

```text
AGENT-REVIEW: GOOD_TO_GO

Reviewed head: <sha>
Human approved the AGENT-REVIEW: HUMAN_SUMMARY for this exact head.
Safe to merge from the review-agent side.
```

## Review Standard

Review agents must use a maintainability-first bar:

- Prefer durable, locally consistent fixes over narrow patches that only satisfy the current symptom.
- Do not suggest one-off special cases unless they are explicitly temporary, bounded, documented, and low-risk.
- Challenge hidden coupling, duplicated logic, broad read-side fallbacks, stale compatibility paths, weak validation, and migration debt.
- If a shortcut is acceptable, state why it is safe, what limits its blast radius, and what follow-up is required.
- Findings should explain the long-term risk, not only the immediate failure.
- If the correct fix requires a wider design change, say that clearly instead of proposing a hacky local workaround.

## Coding Agent Flow

Run from the coding worktree that owns the implementation branch.

1. Establish branch and base:
   ```bash
   git branch --show-current
   git rev-parse --abbrev-ref --symbolic-full-name @{upstream}
   git status --short
   ```
2. Stop if `@{upstream}` does not resolve. The PR base must come from upstream; do not guess.
3. Derive the PR base by stripping the remote prefix from the upstream. Example: `origin/main` becomes `main`.
4. Commit and push intended work only:
   ```bash
   git push -u origin HEAD
   ```
5. Create or update the PR:
   ```bash
   gh pr list --head "$(git branch --show-current)" --state open --json number,url,headRefOid,baseRefName
   gh pr create --base "<derived-base>" --head "$(git branch --show-current)" --fill
   ```
   If a PR already exists for the branch, update and report that PR instead of creating a duplicate.
6. Post or update an `AGENT-CODING: STATUS` comment with PR number, branch, upstream, derived base, latest head SHA, and verification status.
7. Poll comments and review threads on the PR at the requested interval, defaulting to 5 minutes and at most 10 cycles when no interval is specified.
8. For each cycle:
   - Run `npm run agent-pr:status -- <pr>` when available.
   - Refresh PR state and latest head SHA.
   - Stop if the PR is merged, closed, or contains `AGENT-REVIEW: STOP`.
   - Do not pre-filter by GitHub author. First inspect live PR comments/reviews for marker prefixes; treat `AGENT-REVIEW:*` as reviewer state even if the author login matches the coding account.
   - Ignore ordinary unmarked approval text.
   - Address actionable `AGENT-REVIEW: FINDING` or `AGENT-REVIEW: DISCUSSION` comments that apply to the current head or remain unresolved.
   - Ignore `AGENT-CODING:*` status comments and unmarked self chatter as reviewer feedback.
   - If no reviewer updates appear but the PR discussion looks unexpected, verify the live PR comment URLs or run `npm run agent-pr:status -- <pr> --json` before concluding that markers are missing.
   - Push fixes and reply with `AGENT-CODING: ADDRESSED`, including the new commit SHA and verification.
9. Before merging:
   - Run `npm run agent-pr:ready -- <pr>` when available and treat a non-zero exit as a hard blocker.
   - Confirm a valid `AGENT-REVIEW: GOOD_TO_GO` exists for the latest PR head SHA.
   - Confirm no newer commits appeared after that marker.
   - Confirm GitHub mergeability is clean (`mergeStateStatus: CLEAN`, no `mergeable: CONFLICTING`).
   - Confirm present status checks are acceptable under repo policy. An empty status-check rollup (no CI attached) is a warning, not a hard blocker; explicitly report it and rely on branch protection / GitHub mergeability for protected-check enforcement. Bundle Check is the sole informational exception: queued or failed Bundle Check does not block merge.
   - Confirm no unresolved blocking review threads remain.
   - Confirm whitespace hygiene with `git diff --check "origin/<base-ref>...origin/pr/<number>"` from the fetched PR head.
10. Merge only after all pre-merge checks pass. If any check fails, continue the loop or stop with the blocker.

## Review Agent Flow

Run from the primary review worktree or any clean review environment. The review agent may use local git commands to inspect the fetched PR head, but it must not inspect unrelated sibling worktree dirt as part of PR risk.

1. Read the PR URL or number.
2. Parse loop mode:
   - If the invocation includes `every <interval_minutes> minutes`, use that positive number as the wait interval.
   - If no interval was provided, use the default 10-minute interval.
   - Run at most 10 cycles for every invocation.
3. Fetch current PR metadata:
   ```bash
   gh pr view <pr> --json number,url,state,closed,mergedAt,baseRefName,headRefName,headRefOid,mergeStateStatus,mergeable,author,comments,reviews,statusCheckRollup
   ```
   Or run `npm run agent-pr:status -- <pr>` for the shared status summary.
4. Stop if the PR is merged, closed, or contains `AGENT-REVIEW: STOP`.
5. Fetch the exact latest head for review:
   ```bash
   git fetch origin "pull/<number>/head:refs/remotes/origin/pr/<number>"
   ```
6. Review the latest PR head against the PR's actual base branch:
   ```bash
   git fetch origin "<base-ref>"
   git diff --stat "origin/<base-ref>...origin/pr/<number>"
   git diff "origin/<base-ref>...origin/pr/<number>"
   git diff --check "origin/<base-ref>...origin/pr/<number>"
   ```
7. Apply the **Review Standard** above before posting findings. Post only current findings. Do not repeat a finding that the latest diff has already fixed.
8. For each finding or discussion comment:
   - Start with `AGENT-REVIEW: FINDING` or `AGENT-REVIEW: DISCUSSION`.
   - Include severity, file/line when available, and reviewed head SHA.
   - Explain both the immediate problem and the maintainability/design risk when relevant.
   - End with the exact sentence `What do you think?`
   - Do not stop the loop after posting findings or discussion. Those comments ask the implementation side to respond, so the review agent must wait the resolved interval and re-check the latest PR head unless another stop condition fires.
9. If the PR appears safe with no current findings or blocking discussion:
   - Post `AGENT-REVIEW: HUMAN_SUMMARY`.
   - Write the summary in Chinese.
   - Use the readable Markdown section format from the recommended comment shape.
   - Include recommendation, risk level, Bundle Check informational status, purpose, input/trigger, output/behavior change, scope, main risks, maintainability, design risk, verification, and human-review notes.
   - Mention Bundle Check status if it is queued, pending, failed, missing, or passed; do not wait on it.
   - Present the full same `HUMAN_SUMMARY` directly in the current agent conversation after posting it to the PR. Do not only provide a PR comment link or say that the summary was posted elsewhere.
   - Do not post `GOOD_TO_GO` yet.
   - Stop the current loop invocation after posting the summary for this head.
10. If no stop condition fired, wait the resolved interval, then repeat from step 3 until 10 cycles have completed.
11. After explicit human approval, re-fetch PR metadata and confirm the head SHA still matches the summarized SHA.
12. Post `AGENT-REVIEW: GOOD_TO_GO` for that exact SHA, then stop polling.

## Stop Conditions

Both agents stop when:

- PR is merged or closed
- `AGENT-REVIEW: STOP` appears
- required GitHub metadata cannot be fetched
- the PR head or base cannot be resolved
- a merge conflict or blocked check requires human intervention
- the current invocation reaches 10 review cycles
- the review agent posts `AGENT-REVIEW: HUMAN_SUMMARY` for a safe current head

Posting `AGENT-REVIEW: FINDING` or `AGENT-REVIEW: DISCUSSION` is not a stop condition. After posting those comments, continue the bounded review loop from fresh PR metadata on the next cycle.

The review agent also stops after posting valid `GOOD_TO_GO`. The coding agent stops after the PR is merged or after reporting a hard blocker that prevents merge.
