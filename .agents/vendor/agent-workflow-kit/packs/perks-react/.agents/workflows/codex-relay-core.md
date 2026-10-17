# Codex Relay Core

Canonical execution workflow shared by the planning-first and compact relay
skills.

## Shared preflight

Complete this before intake:

1. Resolve the repository root and require a named task branch. Stop on detached
   HEAD, `main`, or `dev`.
2. Require `git status --short` to be empty. Never absorb, stash, clean, or
   discard pre-existing work.
3. Require the `codex:codex-rescue` executor. Do not substitute the conductor
   when the plugin is unavailable.
4. Fetch `origin/dev`, require it to resolve, and lock it as the only PR base.
   This workflow never merges to `main` and never deploys.

Preflight does not authorize editing, tests, dispatch, commits, pushes, or PR
changes. Start execution only with a user-confirmed relay manifest.

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

## Sequential execution

For every pending task in order:

1. Build a self-contained executor prompt containing the repository root,
   branch, task contract, relevant repository instruction files, exact
   verification command, and this prefix:

   ```text
   --wait
   EXECUTION MODE — run synchronously, do NOT detach:
   - Do not run in the background.
   - Run your single codex-companion Bash call with timeout: 600000
     (the 10-minute Bash tool maximum), not the 120-second default.
   - Only consider background execution for work you expect to exceed
     that 10-minute window.
   - Stay within this task's declared files and acceptance criteria.
   - Run the exact requested verification command.
   - Return the files changed, a concise change summary, and literal check result.
   ```

2. Dispatch through `codex:codex-rescue`, keeping the literal `--wait` token
   and the `timeout: 600000` instruction in the forwarded request text — not
   only the surrounding prose. Its routing rules treat `--background`/`--wait`
   as an explicit execution choice only when the literal token is present;
   without it, a bounded relay task can still be routed to background by its
   own complexity heuristic. The timeout instruction widens the forwarder's
   Bash window from the 120-second default that otherwise forces long tasks
   to background around the 2-minute mark. Dispatch stays exclusively through
   `codex:codex-rescue` — do not hand-roll a CLI dispatch wrapper. (The
   deterministic status check in step 3 is a read-only truth check, not a
   dispatch path.)
3. After **every** dispatch — no matter what text the forwarder returned —
   run one deterministic truth check against the companion's persisted job
   state instead of trusting the return text:

   ```bash
   COMPANION=$(ls -d "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs 2>/dev/null | sort -V | tail -1)
   node "$COMPANION" status --json
   ```

   (`CLAUDE_PLUGIN_ROOT` is unset in the main session; resolve the newest
   companion via `ls | sort -V | tail -1`.) The JSON has `running` (array),
   `latestFinished` (object or null), and `recent` (array); each job carries
   `id`, `status`, `title`, `createdAt`. Identify this dispatch's job by
   matching the task title and start time across those three lists — if the
   forwarder's return contained a `task-\S+` handle, require the match to be
   that exact id. Never take the newest job by default. Then:

   - **Matching job in a terminal state** (`completed`/`failed`/`cancelled`):
     fetch the authoritative output with `node "$COMPANION" result <job-id>`
     and use that — not the forwarder's prose — as the task result.
   - **Matching job still `queued`/`running`**: the dispatch detached. Read
     and follow `.agents/workflows/codex-relay-detach-recovery.md`.
   - **No matching job** and the forwarder returned a complete report:
     accept it as a true foreground completion.
   - **The status call itself fails** (companion missing, CLI shape changed):
     stop and surface to the user; do not guess.
4. Run `git status --short` and require every changed path to fall within the
   task's declared `files`. Stop and surface any scope drift; do not silently
   keep or discard it.
5. Run `verificationCommand` in the current worktree. Do not trust the
   executor's report.
6. When scope and verification are green, checkpoint with
   `git add -A && git commit -m "wip(codex-relay): <objective> [<id>]"`. Update
   the task status, verification result, and `lastCheckpointSHA` in any
   persistent manifest immediately.
7. On failure, re-dispatch once with the exact failure and the same scope. If it
   remains red, stop and roll back only the current uncommitted task with
   `git reset --hard HEAD` followed by `git clean -fd`. The clean-start and
   checkpoint invariants make this safe; never reset an earlier checkpoint.

Summarize each task in one or two lines. Do not paste executor transcripts into
the conversation.

## Prepare the review head

After all acceptance units pass:

1. Squash `wip(codex-relay)` checkpoints into clean conventional commits.
   Compare `git diff <startingCheckpointSHA>...HEAD` before and after and require
   byte-identical content. Record the rewritten head as `lastCheckpointSHA`.
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
to the manifest, execute and verify it, checkpoint and squash it, then push.
Every new SHA must restart a fresh adversarial review; no verdict or approval
covers changed code.

Whenever this workflow creates or rewrites a commit, immediately update a
persistent manifest's `lastCheckpointSHA`. A crash before that update causes the
strict resume check to reject the manifest and restart intake.

The final gate owns risk-tiered exact-head verification, full fallback when the
planner cannot safely narrow the gate, exact-head approval, readiness, and
merge. Stop if it blocks, verification is red, or approval does not match the
current SHA. After a confirmed merge, report:

- checkpoint SHAs and targeted verification results;
- review cycles and approval SHA;
- PR URL and merge result;
- the roadmap follow-up to mark an applicable merged track `[x]`.

Never merge to `main`, deploy, release, create nested worktrees, or self-approve.
