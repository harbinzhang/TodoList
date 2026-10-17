# Codex Collaboration Core

Canonical Codex-only execution workflow for a confirmed compact collaboration
manifest.

## Shared preflight

Complete this before intake:

1. Resolve the repository root and require a named task branch. Stop on detached
   HEAD, `main`, or `dev`.
2. Require `git status --short` to be empty. Never absorb, stash, clean, or
   discard pre-existing work.
3. Require native Codex collaboration tools that can spawn and continue
   subagents in the current task. Do not substitute Codex Relay, a CLI wrapper,
   an MCP/plugin executor, or a separate Codex space.
4. Fetch `origin/dev`, require it to resolve, and lock it as the only PR base.
   This workflow never merges to `main` and never deploys.

Preflight does not authorize editing, tests, subagent dispatch, commits, pushes,
or PR changes. Start execution only with a user-confirmed collaboration
manifest.

## Input contract

Accept a confirmed manifest containing the branch, `origin/dev` base, goal,
locked decisions, starting and last checkpoint SHAs, and ordered tasks. Every
task has:

- `id`
- `objective`
- `files`
- `dependencies`
- `acceptanceCriteria`
- `verificationCommand`
- `status`

Require dependencies to point only to earlier tasks. Each verification command
must be exact and targeted rather than the repository-wide gate.

## Sequential native execution

For every pending task in order:

1. Build a self-contained prompt containing the repository root, branch, task
   contract, relevant repository instructions, exact verification command, and
   this prefix:

   ```text
   IMPLEMENTATION TASK -- work in the current shared worktree:
   - Stay within this task's declared files and acceptance criteria.
   - Preserve all work from earlier checkpointed tasks.
   - Do not spawn other subagents or change branches/worktrees.
   - Run the exact requested verification command.
   - Return the files changed, a concise change summary, and literal check result.
   ```

2. Spawn exactly one fresh native Codex implementation subagent with no
   inherited conversation when supported. Execute tasks sequentially; never
   let two implementation agents edit the shared worktree concurrently.
3. Wait for the subagent to finish. The root agent owns user communication,
   approvals, repository state, verification, commits, pushes, and PR changes.
4. Run `git status --short` and require every changed path to fall within the
   task's declared `files`. Stop and surface scope drift; do not silently keep,
   clean, or discard it.
5. Run `verificationCommand` in the current worktree. Do not trust only the
   subagent's report.
6. On scope or verification failure, continue the same subagent once with the
   exact evidence and unchanged task scope. Recheck the worktree and command.
   If it remains red, stop and preserve the current state for inspection.
7. When scope and verification are green, checkpoint with
   `git add -A && git commit -m "wip(codex-collaboration): <objective> [<id>]"`.
   Update task status, verification result, and `lastCheckpointSHA` in the
   manifest immediately.

Summarize each task in one or two lines. Do not paste subagent transcripts into
the conversation.

## Prepare the review head

After all acceptance units pass:

1. Squash `wip(codex-collaboration)` checkpoints into clean conventional
   commits. Compare `git diff <startingCheckpointSHA>...HEAD` before and after
   and require byte-identical content. Record the rewritten head as
   `lastCheckpointSHA`.
2. Require the branch upstream to resolve to `origin/dev`. If it has no
   upstream, set it to `origin/dev`; if it points elsewhere, stop.
3. Push without changing upstream using `git push origin HEAD:<branch>`, then
   create or reuse a PR whose base is `dev`.
4. If the work came from a roadmap epic or track, update that track in the same
   PR to `[>]` with its real `PR:#<n>`, leave the linked work in progress,
   regenerate `docs/roadmap/progress.md` with
   `node scripts/roadmap-status.mjs`, explicitly commit the two roadmap files,
   record that commit as `lastCheckpointSHA`, and push. For standalone work,
   record that no epic applies and do not invent one.
5. Invoke `$pall <PR URL or number>` only after the final intended head is
   pushed.

## Review findings and finish

Evaluate review findings rather than accepting them mechanically. Convert every
valid blocker into a new scoped fix task using the same task contract, append it
to the manifest, and execute it through a fresh native Codex implementation
subagent. Verify, checkpoint, squash, and push the fix. Every new SHA must start
a fresh adversarial review; no verdict or approval covers changed code.

Whenever this workflow creates or rewrites a commit, immediately update the
manifest's `lastCheckpointSHA`. A crash before that update causes the strict
resume check to reject the manifest and restart intake.

The final gate owns risk-tiered exact-head verification, full fallback when the
planner cannot safely narrow the gate, exact-head approval, readiness, and
merge. Stop if it blocks, verification is red, or approval does not match the
current SHA. After a confirmed merge, report:

- checkpoint SHAs and targeted verification results;
- review cycles and approval SHA;
- PR URL and merge result;
- the roadmap follow-up to mark an applicable merged track `[x]`.

Never merge to `main`, deploy, release, create nested worktrees, use an external
executor, or self-approve.
