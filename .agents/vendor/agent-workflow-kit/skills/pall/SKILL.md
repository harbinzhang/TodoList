---
name: pall
description: Use when the user explicitly invokes $pall or confirms a Codex Relay, Codex Collaboration, or Multi-CC manifest that delegates a PR to the risk-tiered final pull-request gate.
---

# PALL

Keep the safety properties of `pal` while using one fresh adversarial reviewer per
head SHA and no polling coordinator.

Invoke as `$pall [<PR URL or number>]`, or load it from a confirmed Codex Relay,
Codex Collaboration, or Multi-CC core with that PR. Do not accept an interval
argument.

## Authority

Direct `$pall` invocation or the execution confirmation recorded in a Codex
Relay, Codex Collaboration, or Multi-CC manifest authorizes intended PR-scope
pushes, PR comments, safe fixes, risk-tiered exact-head verification, full
fallback verification, and merge after every gate passes.
Do not deploy, release, modify sibling worktrees, clean unrelated dirt, or guess
a branch, base, or merge method.

Keep roles separate:

- The root agent owns code, verification, pushes, readiness, and merge. It never
  emits `AGENT-REVIEW:*` markers.
- A fresh reviewer owns the independent verdict and, only in a later turn, its
  PR review markers and exact-head approval. It never edits code or merges.

## Preconditions

1. Read repository instructions and inspect the current worktree, branch,
   upstream, dirt, and worktree list.
2. Require a named implementation branch with a resolvable upstream. Derive the
   base from that upstream; never fall back to a configured default.
3. Create or reuse the branch PR with `gh` when needed. If a PR is supplied,
   require its head and base to match the current branch and derived base.
4. Freeze the PR `baseRefOid` as the verification base and `headRefOid` as the
   candidate review SHA. Require a clean worktree and `git rev-parse HEAD` to
   equal that SHA before review. A local or remote mismatch stops the cycle;
   never review one SHA and verify another.
5. Stop for unsafe dirt, a closed PR, branch mismatch, missing permissions,
   unresolved merge method, or unavailable independent agents.

## Event-Driven Review

For each previously unseen head SHA:

1. Freeze the PR base and head. Collect the original requirements, repository
   instructions, complete base-to-head diff, and only the surrounding code
   needed to understand it.
2. Spawn exactly one fresh subagent with no inherited conversation when the
   runtime supports that option. Tell it to use `adversarial-review` for this
   exact base and head.
3. Give the reviewer no author conclusions, suspected bugs, previous findings,
   proposed fixes, or verification results before its verdict.
4. Require `REJECT`, `CONDITIONAL`, or `PASS`, bound to the exact head SHA.

After the read-only verdict completes, the root may trigger a second turn on the
same reviewer as a thin publisher. Do not invoke `adversarial-review` again in
that publisher turn.

- For `REJECT`, have the reviewer post evidence-backed
  `AGENT-REVIEW: FINDING` comments for its blockers.
- For `CONDITIONAL`, have it post the minimum
  `AGENT-REVIEW: DISCUSSION` needed to resolve the uncertainty.
- End each finding or discussion with `What do you think?`

The root evaluates findings rather than accepting them mechanically. For a valid
blocker, add regression coverage, implement the smallest maintainable fix, run
targeted checks, push a new SHA, and start again with a new reviewer. Never let
the previous reviewer assess changed code.

When `$pall` was entered from a confirmed Codex Collaboration manifest, preserve
that core's ownership rule: convert each valid blocker into a scoped manifest
task and have a fresh native Codex implementation subagent make the fix. The
root still verifies, checkpoints, pushes, and restarts review. For other `$pall`
invocations, the root may implement the fix directly.

## Risk-Tiered Verification and Approval

On `PASS`:

1. Immediately re-fetch the PR head and require both it and
   `git rev-parse HEAD` to equal the reviewed SHA. Require
   `git status --porcelain` to be empty before planning; a clean commit identity
   does not make unreviewed worktree changes safe.
2. Generate the exact-range verification plan:

   ```bash
   npm run agent-pr:verify-plan -- \
     --base <frozen-baseRefOid> \
     --head <reviewedSHA> \
     --json
   ```

   Require the reported `base` and `head` to equal those frozen SHAs. Never use
   PR size or changed-line count as a risk signal.
3. If `fallbackToFullVerify` is `true`, run the repository `verify` skill, then
   run every additional specialized lane in `required` other than the
   `full-verify` marker. If it is `false`, run every lane in both `baseline` and
   `required`; never omit or weaken a planned lane. Continue independent lanes
   after failures when safe.
4. The root may add targeted checks when the diff or reviewer exposes risk that
   the planner did not require. It may accept a planned UI E2E waiver only when
   the planner lists `focused-e2e` under `skipped`, the exact-head reviewer
   returned `PASS`, and all `uiReview.waiverCriteria` are true. Record the
   planner's skip reason in the verification evidence.
5. If planning fails but the frozen base, reviewed SHA, current PR head, and
   local `HEAD` can still be independently validated, fall back to the
   repository `verify` skill. Stop instead when exact range identity cannot be
   proven.
6. Re-fetch the PR head after verification and again require both remote head
   and local `HEAD` to equal the reviewed SHA. Also require
   `git status --porcelain` to remain empty; generated or modified tracked files
   mean verification did not run against the reviewed tree. Any mismatch or
   dirt invalidates the verdict and verification; stop and begin a fresh cycle
   for the new SHA.
7. If verification exposes an in-scope defect, fix it, push a new SHA, and start
   a fresh review. Stop on unsafe, unrelated, or ambiguous failures.
8. Trigger the same reviewer in publisher mode with the locked verdict, planner
   classification, commands run, skipped lanes with reasons, and exact
   verification evidence.
9. Have the reviewer refresh live PR state, prior findings, review threads,
   mergeability, and `git diff --check`.
10. Only when clear, have it post a concise Chinese
   `AGENT-REVIEW: HUMAN_SUMMARY`, refresh the head immediately, and post
   `AGENT-REVIEW: GOOD_TO_GO` containing the exact SHA.

Any code change invalidates the verdict and approval. The publisher must stop
instead of approving when the head changed or review state is not clean.

## Merge

After exact-head approval, record that SHA as `approvalSHA` and have the root run:

```bash
npm run agent-pr:ready -- <pr>
```

Require an open PR, matching approval SHA, clean mergeability, no actionable
feedback or blocking thread, and clean whitespace. Re-fetch the PR head and
require it still equals `approvalSHA`, then merge with an atomic expected-head
guard:

- With GitHub CLI, include `--match-head-commit <approvalSHA>` in the established
  `gh pr merge` command.
- With the GitHub connector, pass `expected_head_sha: <approvalSHA>`.

If the guarded merge rejects because the head advanced, do not retry unguarded;
start a fresh review cycle. If the established merge mechanism cannot enforce an
expected head, stop. Refresh GitHub state and confirm the merged SHA.

## Token Guard

- Do not load or invoke `pcl`, `prl`, or their shared polling workflow.
- Do not poll on a timer. Refresh only after a verdict, comment, push,
  verification result, approval, or merge attempt.
- Do not spawn a coordinator around the fresh reviewer.
- Do not resend the full diff after the reviewer has locked its verdict unless
  the head changed.

Report the PR URL, base, final head, review cycles, findings disposition,
verification-plan classification, commands run, skipped lanes with reasons,
approval SHA, merge result, and residual risk.
