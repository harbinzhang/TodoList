# PR Adversarial Loop

Orchestrate the canonical coding and review loops without duplicating their PR marker protocol. The current/root agent is the coding owner; a review-coordinator subagent runs the reviewer side; a fresh nested reviewer evaluates each new head independently.

## Parameters

```text
$pr-adversarial-loop [<PR URL or number>] [every <positive minutes> minutes]
```

- Without an interval override, keep PCL at 5 minutes and PRL at 10 minutes.
- With `every <minutes> minutes`, require a positive number and pass it to both loops.
- Keep each underlying PCL and PRL invocation bounded to 10 cycles.
- Do not create a Codex automation unless the user separately requests one.

## Preconditions

1. Read repository instructions and inspect the current worktree, branch, upstream, and worktree list.
2. Require a named implementation branch with a resolvable upstream. Derive the PR base from that upstream; never guess.
3. If a PR was supplied, fetch its metadata and require its head branch to match the current branch and its base to match the upstream-derived base. Do not check out another branch automatically.
4. If no PR was supplied, use the PCL initialization flow to commit only intended work, push the current branch, and create or reuse its PR. Obtain the PR URL before starting the reviewer.
5. Stop for unrelated dirty files that cannot be preserved safely, missing permissions, a closed PR, or `AGENT-REVIEW: STOP`.

## Roles

### Coding owner

Run `pcl` in the current/root agent and current coding worktree. Own implementation, targeted tests, the final `verify` run, pushes, coding markers, readiness checks, and merge. Never emit `AGENT-REVIEW:*` markers or approve the current agent's work.

### Review coordinator

Spawn one independent subagent running `prl` for the PR. Use explicit fetched refs and PR state; ignore current-worktree dirt. Own `AGENT-REVIEW:*` markers, prior-finding closure checks, the Chinese human summary, and `GOOD_TO_GO`. Never edit code or merge.

### Fresh adversarial reviewer

For every unseen head SHA, the review coordinator must spawn a fresh subagent using `adversarial-review`. Give it only repository instructions, original requirements/PR description, the actual base and exact head SHAs, complete diff, and necessary file context.

Do not give it previous findings, verification results, author conclusions, suspected bugs, coder explanations, or proposed fixes. After the independent verdict is complete, let the review coordinator separately compare previous findings with the new head and closure evidence.

## Review and Fix Cycle

1. Refresh PR metadata and the latest head before every review cycle.
2. Run the fresh adversarial pass against the complete base-to-head diff.
3. Map the verdict:
   - `REJECT`: post each blocking issue as `AGENT-REVIEW: FINDING` with severity, file/line, evidence, impact, reviewed SHA, correction/proof, and `What do you think?`
   - `CONDITIONAL`: post the missing decision or validation as `AGENT-REVIEW: DISCUSSION` with the reviewed SHA and `What do you think?`
   - `PASS`: perform prior-finding closure checks, mergeability checks, thread checks, and `git diff --check` before continuing to the verification handshake
4. Treat protocol marker strings as parser syntax. Every PR comment may contain only its own complete leading marker; never quote another complete `AGENT-REVIEW:` marker in prose or examples. Describe withheld or future states in ordinary language, then refresh `agent-pr:status` after posting to catch marker misclassification.
5. Have the coding owner evaluate actionable findings rather than accepting them mechanically. For a valid blocker, add regression coverage, implement the smallest maintainable fix, run targeted verification, push a new SHA, and post `AGENT-CODING: ADDRESSED` with the comment reference, new SHA, reasoning, and commands/results.
6. Treat every new SHA as a new full review target. Never reuse an earlier verdict or approval.

## Full Verification Handshake

A clean adversarial pass is necessary but not sufficient for approval in this orchestration.

1. Look for explicit evidence that the canonical `verify` skill passed in full for the exact current head SHA.
2. If the evidence is missing, post one non-duplicate `AGENT-REVIEW: DISCUSSION` stating `Adversarial verdict: PASS`, the reviewed head SHA, and that full local verification is required. End with `What do you think?`; say in ordinary prose that summary and approval are withheld, without quoting their reserved marker strings. This marker is the durable clean-review record if PRL restarts before verification finishes.
3. Have the coding owner run every `verify` lane. Continue through all lanes after a failure and publish the complete result for the same SHA in `AGENT-CODING: ADDRESSED` when responding to the verification discussion.
4. If verification exposes an in-scope defect, fix it, run targeted proof, push a new SHA, and restart independent review. If it fails for an unsafe, unrelated, or ambiguous reason, stop as blocked.
5. If full verification passes and the head has not changed, reuse the recorded clean adversarial verdict for that exact SHA. Recheck prior findings, current discussions, threads, mergeability, and `git diff --check`.
6. Post the Chinese `AGENT-REVIEW: HUMAN_SUMMARY`, immediately refresh the head, and post `AGENT-REVIEW: GOOD_TO_GO` only when it still matches. Mention CI/status checks as informational; never describe missing checks as passed.

A later `GOOD_TO_GO` supersedes an earlier verification discussion for readiness because the discussion predates the exact-head approval. Any marker or code change after approval must be evaluated from fresh PR state.

## Persistence and No-Progress Guard

Use the PR as the durable coordination source. Track a progress tuple from current PR state: head SHA, actionable feedback identities/status, full-verification status, and mergeability.

- Restart a capped PCL or PRL invocation only when the PR remains open and progress occurred since the prior coordinator checkpoint.
- Count checkpoints no faster than the effective reviewer interval.
- Stop as `BLOCKED` when the tuple is unchanged for three consecutive checkpoints, or sooner when progress requires user judgment, new authority, or unavailable external state.
- Polling alone is not progress. Do not spawn replacement agents merely to reset the count.

## Merge and Cleanup

After a valid current-head `GOOD_TO_GO`, have the coding owner run `agent-pr:ready` and the PCL pre-merge checks. Require an open PR, exact latest reviewed SHA, clean mergeability, no current blocking threads or actionable feedback, and passing whitespace hygiene.

Merge through the canonical PCL flow. Then refresh GitHub state, confirm the PR is merged, stop or interrupt remaining child agents, and report the merge result and exact approval SHA.

On a closed PR, `AGENT-REVIEW: STOP`, unsafe branch mismatch, hard conflict, permission failure, user decision, or no-progress block, stop every child agent and do not merge. Do not deploy, release, or modify sibling worktrees.
