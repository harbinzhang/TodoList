---
description: Shared PR comment protocol for coding and review agents working across independent worktrees and agent runtimes
---

# PR Agent Loop

Use this workflow when a coding agent and a review agent coordinate through a GitHub pull request. It is platform-neutral and works for Codex, Claude Code, Gemini Code, or other tools as long as they can read and write PR comments.

The PR is the shared state source. Do not rely on local state files, hidden agent memory, or runtime-specific automation state for correctness.

Use these read-only helpers when the consumer repo exposes the npm aliases:

```bash
npm run agent-pr:status -- <pr-url-or-number>
npm run agent-pr:ready -- <pr-url-or-number>
```

The aliases are installed by `scripts/install-skill-to-repo.mjs` when registering
`pr-coding-loop` or `pr-review-loop` in a consumer repo that has `package.json`
and a current vendored AWK helper. If the aliases are missing but the current
AWK kit is vendored, run the helper directly:

```bash
node .agents/vendor/agent-workflow-kit/scripts/agent-pr-status.mjs status <pr-url-or-number>
node .agents/vendor/agent-workflow-kit/scripts/agent-pr-status.mjs ready <pr-url-or-number>
```

If neither helper path exists, use the `gh pr view`, issue-comment,
inline-comment, and GraphQL review-thread commands in the flows below and treat
that as equivalent manual status collection.

`agent-pr:status` summarizes markers, latest head SHA, mergeability, status checks, active review feedback markers, a recent `AGENT-REVIEW:*` marker audit, an inline thread audit with blocking thread URLs and locations, unresolved review threads, blockers, and warnings. `agent-pr:ready` performs the same checks and exits non-zero unless the PR has a valid `AGENT-REVIEW: GOOD_TO_GO` for the latest head, GitHub reports `mergeStateStatus: CLEAN`, no merge conflict is reported, no active `AGENT-REVIEW: FINDING` / `AGENT-REVIEW: DISCUSSION` marker remains after that valid approval, and no review-thread blockers remain. Treat these helpers as readiness gates, not as the only source of PR discussion truth: `Unresolved review threads: 0` only means there are no current blocking inline `reviewThreads`; it does not prove every top-level PR conversation comment is semantically resolved. CI/status checks are informational only for this review loop: missing, pending, failed, blocked, or empty status-check rollups must not block review progress, `HUMAN_SUMMARY`, `GOOD_TO_GO`, or merge readiness. Mention status-check state in summaries when useful. If an earlier `AGENT-REVIEW: FINDING` or `AGENT-REVIEW: DISCUSSION` is solely about CI/status checks, treat that marker as informational and non-blocking even if the helper still counts it as active feedback.

## Loop Parameters

Coding-agent loop mode defaults to a bounded polling loop:

```text
$pr-coding-loop <PR URL or number>
```

- Default coding interval: 5 minutes.
- Default cap: 10 coding cycles per invocation.
- Optional override: `$pr-coding-loop <PR URL or number> every <interval_minutes> minutes`.
- `interval_minutes`, when provided, must be a positive number.
- A coding cycle means: fetch PR metadata, inspect marker comments across top-level PR conversation comments, inline review comments, and inline review-thread state, address actionable review comments when present, push fixes if needed, and report status.

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
- Merge conflicts and `DIRTY` / `CONFLICTING` merge state are non-terminal current-head blockers. Report them as findings or discussions and keep polling until the PR changes, a real stop condition appears, or the cycle cap is reached. CI/status checks are informational only and must not be reported as review blockers.
- Wait the resolved interval between cycles. Do not create a background scheduler or Codex automation unless the human explicitly asks for one.
- Stop conditions always take precedence over the 10-cycle cap.
- Posting `AGENT-REVIEW: HUMAN_SUMMARY` for a safe current head is immediately followed by a paired `AGENT-REVIEW: GOOD_TO_GO` for that exact head, then stops the current loop invocation.

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
- Check every PR comment surface before deciding marker state. `AGENT-REVIEW: FINDING`, `AGENT-REVIEW: DISCUSSION`, `AGENT-REVIEW: STOP`, `AGENT-REVIEW: HUMAN_SUMMARY`, and `AGENT-REVIEW: GOOD_TO_GO` may be in top-level PR conversation comments from `issues/<n>/comments`; inline review comments from `pulls/<n>/comments` and GraphQL `reviewThreads` are necessary but not sufficient.
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
Recommendation: merge
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

### 合并注意事项
<Chinese summary>
```

```text
AGENT-REVIEW: GOOD_TO_GO

Reviewed head: <sha>
Automatically marked GOOD_TO_GO after posting AGENT-REVIEW: HUMAN_SUMMARY for this exact head.
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
7. Poll all PR comment surfaces and review threads at the requested interval, defaulting to 5 minutes and at most 10 cycles when no interval is specified:
   ```bash
   gh pr view <pr> --json number,url,state,closed,mergedAt,baseRefName,headRefName,headRefOid,mergeStateStatus,mergeable,author,comments,reviews,statusCheckRollup
   gh api repos/<owner>/<repo>/issues/<n>/comments --paginate
   gh api repos/<owner>/<repo>/pulls/<n>/comments --paginate
   gh api graphql -f owner=<owner> -f repo=<repo> -F number=<n> -f 'query($owner:String!,$repo:String!,$number:Int!){ repository(owner:$owner,name:$repo){ pullRequest(number:$number){ reviewThreads(first:100){ nodes{ id isResolved isOutdated } } } } }'
   ```
   Top-level PR conversation comments (`issues/<n>/comments`) are where review agents often post `AGENT-REVIEW:*` markers. Inline review comments (`pulls/<n>/comments`) and GraphQL `reviewThreads` are separate surfaces.
8. For each cycle:
   - Run `npm run agent-pr:status -- <pr>` when available, or the direct vendored helper if the npm alias is absent. Its `Active review feedback` count covers `AGENT-REVIEW: FINDING` / `AGENT-REVIEW: DISCUSSION` markers found in top-level PR comments, formal reviews, inline comments, and GraphQL inline review-thread comments. Its `Unresolved review threads` count only describes inline `reviewThreads`; do not use it as proof that issue-level PR comments are semantically clear. If active feedback is solely about CI/status checks, treat it as informational and non-blocking.
   - Read the recent `AGENT-REVIEW:*` marker audit printed by the helper every cycle. If it is empty, confirm the empty audit line is present instead of inferring that no markers exist from review-thread counts.
   - Read the `Inline thread audit` printed by the helper every cycle. For every `unresolved current` entry, follow the printed URL/location and either address the thread or explain why it is not actionable. A current unresolved inline thread blocks readiness even when the latest thread comment has no `AGENT-REVIEW:*` marker.
   - Refresh PR state and latest head SHA.
   - Stop if the PR is merged, closed, or contains `AGENT-REVIEW: STOP`.
   - Do not pre-filter by GitHub author. First inspect live PR conversation comments, PR reviews, inline review comments, and `reviewThreads` for marker prefixes; treat `AGENT-REVIEW:*` as reviewer state even if the author login matches the coding account.
   - Ignore ordinary unmarked approval text.
   - Address actionable `AGENT-REVIEW: FINDING` or `AGENT-REVIEW: DISCUSSION` comments that apply to the current head or remain unresolved, including top-level PR conversation comments even when all inline threads are resolved or outdated. CI/status-check-only markers are informational and do not require coding-agent action.
   - Ignore `AGENT-CODING:*` status comments and unmarked self chatter as reviewer feedback.
   - If no reviewer updates appear but the PR discussion looks unexpected, verify both `issues/<n>/comments` and `pulls/<n>/comments` live URLs before concluding that markers are missing.
   - Reference failure mode: inline findings can appear under `pulls/<n>/comments` and GraphQL `reviewThreads`, while blocking `AGENT-REVIEW:*` discussion can appear under `issues/<n>/comments`. Clearing inline threads does not clear issue-level discussion.
   - Push fixes and reply with `AGENT-CODING: ADDRESSED`, including the new commit SHA and verification.
9. Before merging:
   - Run `npm run agent-pr:ready -- <pr>` when available, or the direct vendored helper if the npm alias is absent, and inspect its blockers. Treat non-status-check blockers as hard blockers; ignore blockers that are only about missing, pending, failed, blocked, or empty CI/status checks.
   - Confirm a valid `AGENT-REVIEW: GOOD_TO_GO` exists for the latest PR head SHA.
   - Confirm no newer commits appeared after that marker.
   - Confirm GitHub mergeability is clean (`mergeStateStatus: CLEAN`, no `mergeable: CONFLICTING`).
   - Treat CI/status checks as informational only for this workflow. Missing, pending, failed, blocked, or empty status-check rollups do not block merge-readiness discussion; mention them in summaries when useful and rely on branch protection / GitHub mergeability for enforced checks.
   - Confirm no unresolved blocking review threads remain.
   - Confirm no top-level, formal-review, or inline `AGENT-REVIEW: FINDING` / `AGENT-REVIEW: DISCUSSION` comments remain actionable or unanswered for the latest PR head, ignoring CI/status-check-only markers.
   - Confirm the helper's `Inline thread audit` has `unresolved current: 0`.
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
   Or run `npm run agent-pr:status -- <pr>` / the direct vendored helper for the shared status summary.
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
7. Check mergeability and review readiness for the current head:
   - Treat `DIRTY` / `CONFLICTING` merge state, merge-tree conflicts, and unresolved blocking threads as current-head blockers. Treat CI/status checks as informational only.
   - Post them as `AGENT-REVIEW: FINDING` or `AGENT-REVIEW: DISCUSSION` with the reviewed head SHA and `What do you think?`
   - Do not convert those blockers into a loop stop condition unless PR metadata, the head ref, or the base ref cannot be fetched or resolved.
   - Do not repost the same blocker for the same head unless there is new evidence; still wait the resolved interval and continue the loop from fresh PR metadata.
   - If any current-head blocker exists, do not post `AGENT-REVIEW: HUMAN_SUMMARY` in the same cycle.
8. Apply the **Review Standard** above before posting findings. Post only current findings. Do not repeat a finding that the latest diff has already fixed.
9. For each finding or discussion comment:
   - Start with `AGENT-REVIEW: FINDING` or `AGENT-REVIEW: DISCUSSION`.
   - Include severity, file/line when available, and reviewed head SHA.
   - Explain both the immediate problem and the maintainability/design risk when relevant.
   - End with the exact sentence `What do you think?`
   - Do not stop the loop after posting findings or discussion. Those comments ask the implementation side to respond, so the review agent must wait the resolved interval and re-check the latest PR head unless another stop condition fires.
10. If the PR appears safe with no current findings or blocking discussion:
   - Post `AGENT-REVIEW: HUMAN_SUMMARY`.
   - Write the summary in Chinese.
   - Use the readable Markdown section format from the recommended comment shape.
   - Include `Recommendation: merge`, risk level, Bundle Check informational status, purpose, input/trigger, output/behavior change, scope, main risks, maintainability, design risk, verification, and merge notes.
   - Mention Bundle Check status if it is queued, pending, failed, missing, or passed; do not wait on it.
   - Immediately re-check that the current PR head SHA still matches the summarized SHA. If it changed, do not post `GOOD_TO_GO`; continue the loop from fresh PR metadata.
   - If the head still matches, post `AGENT-REVIEW: GOOD_TO_GO` for that exact SHA.
   - Present the full same `HUMAN_SUMMARY` directly in the current agent conversation after posting it to the PR, and report that `GOOD_TO_GO` was posted for the reviewed SHA. Do not only provide PR comment links or say that the summary was posted elsewhere.
   - Stop the current loop invocation after posting the summary and paired `GOOD_TO_GO` for this head.
11. If no stop condition fired, wait the resolved interval, then repeat from step 3 until 10 cycles have completed.

## Stop Conditions

Both agents stop when:

- PR is merged or closed
- `AGENT-REVIEW: STOP` appears
- required GitHub metadata cannot be fetched
- the PR head or base cannot be resolved
- the current invocation reaches 10 review cycles
- the review agent posts `AGENT-REVIEW: HUMAN_SUMMARY` and the paired `AGENT-REVIEW: GOOD_TO_GO` for a safe current head

Posting `AGENT-REVIEW: FINDING` or `AGENT-REVIEW: DISCUSSION` is not a stop condition. Merge conflicts, `DIRTY` / `CONFLICTING` merge state, and unresolved blocking review threads are also not stop conditions for the review loop; they are current-head blockers to report, then re-check on the next cycle. CI/status checks are informational only and must not be reported as blockers. After posting those comments, continue the bounded review loop from fresh PR metadata on the next cycle.

The review agent also stops after posting valid `GOOD_TO_GO`. The coding agent stops after the PR is merged or after reporting a hard blocker that prevents merge.
