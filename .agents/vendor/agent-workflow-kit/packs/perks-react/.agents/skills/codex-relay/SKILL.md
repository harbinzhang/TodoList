---
name: codex-relay
description: Use when the user wants Claude to plan a change (brainstorm), have the human confirm the plan, then hand each task off to the OpenAI Codex CLI (codex:codex-rescue subagent) one at a time with checkpoint commits, and finish with a Codex + Claude dual adversarial review. Trigger on "codex-relay", "relay to codex", "plan then let codex build it", "let codex execute the tasks", "codex as executor", or any request to orchestrate Codex-as-executor under a human-confirmed plan. Prefer this over sprint/forge when the work happens inside an existing git worktree on an npm-workspaces repo, because it executes in place instead of spawning fresh per-task worktrees.
---

# Codex Relay

Drive a change through four gated stages: **Plan → Confirm → Codex per-task execution → Dual adversarial review.** Claude (this session) stays the conductor — it plans, holds the human gate, dispatches Codex per task, verifies, and reconciles the final review. Codex does the actual editing, one task at a time.

## Why this shape

- The human confirms the plan **before** any code is written — the hard gate that `sprint` and `forge` leave implicit.
- Codex executes each task in the **current worktree** (which already has `node_modules` installed and shared packages built), so targeted tests run without the fresh-worktree / npm-workspaces breakage that per-task-worktree tools hit in this repo.
- Every task ends in a checkpoint commit, so a bad task is one `git reset` away from a clean base.
- Two independent models review the final diff (Codex via `/codex:adversarial-review`, Claude via the `adversarial-review` skill), catching what a single-model pass misses.

## Preconditions

1. Confirm a git repo on a task branch that is **neither `main` nor `dev`**. Run `git branch --show-current`; if on `main` or `dev`, stop and ask the user to branch first. `dev` is excluded because Finish opens the PR *targeting* `dev` — working on `dev` itself would make base == head and the PR cannot be created.
2. Require a **clean working tree** before starting — `git status --short` must be empty (no staged, unstaged, or untracked changes). This clean baseline is what makes checkpoints and rollbacks safe: with it, and with every prior task committed, the only uncommitted changes at any point are the *current* task's. If the tree is dirty, stop and ask the user to commit, stash, or discard first — never start the relay on a dirty tree, or checkpoints will swallow (and rollbacks will destroy) unrelated work.
3. Confirm the Codex plugin is available: the `codex:codex-rescue` subagent must be registered. If it is not, stop and tell the user to install/enable the `openai-codex` plugin — do **not** silently fall back to Claude for execution (that would defeat the comparison).

## Stage 1 — Plan (brainstorm)

Invoke the `superpowers:brainstorming` skill to explore intent, requirements, constraints, and design before writing anything. Brainstorming first prevents planning the wrong thing.

Then turn the agreed design into an ordered **task list** (prefer `superpowers:writing-plans` for the breakdown). Each task must be:

- small and independently verifiable — one coherent unit of behavior;
- tagged with the files/areas it touches;
- given explicit acceptance criteria plus the **targeted** check that proves it (the specific `npx vitest run <file>`, `npm run typecheck`, `npm run typecheck:functions`, etc. — NOT the full suite);
- ordered so an earlier task never depends on a later one.

Write the task list to a working doc in your scratchpad directory. This doc is the conductor's tracker only — Codex never reads it; each Codex dispatch carries its own self-contained prompt.

## Stage 2 — Human confirm gate (the differentiator — never skip)

Present the full task list to the user and STOP for explicit approval before dispatching any Codex task. Use `AskUserQuestion` or a direct "approve / adjust?" prompt. Do not start execution on implicit or ambiguous acknowledgement. If the user edits the plan, revise and re-confirm.

## Stage 3 — Codex per-task execution (sequential, checkpoint commits)

For each task in order:

1. **Build a self-contained prompt** for Codex — it cannot see this conversation. Include:
   - repo root path, current branch, that it is write-capable and scoped to **this task only**;
   - the task statement + acceptance criteria + the exact files/areas;
   - the conventions that matter for correctness: no `undefined` in Firestore writes (use `null` or conditional spread); timestamps via `createDoc`/`createDocWithId`/`updateDocById` helpers; no `alert()`/`confirm()` (use `useToast` + `ConfirmationModal`); 2-space indent, single quotes, no semicolons; tests colocated; contract-boundary rules if it touches `packages/contracts` or `functions/src/types.ts`. Point Codex at `CLAUDE.md` and `.agents/conventions.md` rather than repeating everything;
   - the targeted check to run and make green before returning, and an instruction to report exactly what it changed + the check result.
2. **Dispatch** via the Agent tool with `subagent_type: "codex:codex-rescue"` and that prompt. This is the plugin's supported path — do not hand-roll a `codex` CLI wrapper, and do not write `/codex:rescue ...` as plain text (that does nothing).
3. **Verify yourself** — run the task's targeted check in the current worktree. Do not trust Codex's self-report; a `codex:codex-rescue` wrapper can over-report success or run stray commands.
   - **Check scope first.** Run `git status --short` and confirm every changed/added path falls within this task's declared file scope. If Codex touched files outside scope, STOP and surface the stray paths to the user — decide together whether to keep them, revert just those paths (`git checkout -- <path>` / `rm` the stray untracked file), or abort the task. Never blind-commit unverified scope creep.
   - Green **and** in-scope → checkpoint: `git add -A && git commit -m "wip(codex-relay): <task> [T<n>]"`. `git add -A` is safe here *only* because the tree started clean and every prior task is already committed, so it captures this task alone.
   - Red → re-dispatch `codex:codex-rescue` **once** with the failing output to fix (resume-style, self-contained), then re-verify. Still red → STOP and roll back **only this task's uncommitted work**: `git reset --hard HEAD` (HEAD is the last good checkpoint), then `git clean -fd` to drop untracked files this task created. Never reset to an older SHA and never run a tree-wide `git checkout -- .` guess — either can destroy earlier tasks' or the user's work. Surface the failure; never build the next task on a broken base.
4. **Keep the conductor lean** — summarize each task's outcome in one or two lines; do NOT paste Codex's full transcript back into the conversation.

## Stage 4 — Dual adversarial review

Once all tasks are checkpointed, review the **accumulated diff** (branch merge-base → HEAD) with two independent reviewers:

1. **Codex** — dispatch `codex:codex-rescue` in read-only adversarial mode over the branch diff (the programmatic equivalent of `/codex:adversarial-review`). Tell it explicitly: read-only, find weaknesses not wins, evidence-backed blockers only.
2. **Claude** — invoke the `adversarial-review` skill on the same exact diff (same base/target SHAs).

Reconcile: dedupe overlapping findings, keep only evidence-backed blockers, and present one ranked list (Critical / Important / Suggestion) noting where the two reviewers agreed vs diverged — divergence is signal. For confirmed blockers, loop back into Stage 3 (new fix task → Codex → verify → checkpoint), then **re-run this entire Stage 4 dual review against the new diff** — the fix changed the diff and the head SHA, so the prior review no longer covers what would ship. Repeat find → fix → re-review until **both reviewers report zero blockers on the current head**; only then proceed to Finish. (Alternatively, hand off to the user if they prefer to resolve the blockers manually.)

Never proceed to Finish, and never post `GOOD_TO_GO`, while any blocker stands or while the **diff content** changed since the last completed review. Binding is to the reviewed diff content (`git diff <base>...<head>`), **not** the raw commit topology: a fix that changes the diff requires re-review, but a history-only rewrite that preserves the diff — notably the Finish squash — does not. Each Stage 4 pass is a single adversarial review of one exact diff — the loop is find → fix → re-review, not continuous polling.

## Finish

Once Stage 4 leaves **no unresolved blocker**, proceed through the following without waiting for user acknowledgement:

1. Squash the `wip(codex-relay)` checkpoints into clean conventional commits. This rewrites the head SHA but must **not** change the diff — verify `git diff <base>...HEAD` is byte-identical before and after the squash. If the squash altered the diff at all, treat it as a content change and return to Stage 4 to re-review before continuing. Because Stage 4 binds to diff content (not raw SHA), a diff-preserving squash does not invalidate the passed review.
2. Run the full gate (`npm run typecheck`, `npm run test`, and contract/i18n gates as relevant).
3. **If the change is proper** — the full gate is green and no reviewer blocker remains — push the branch and open a PR **targeting `dev`** directly with `gh pr create --base dev` (there is no `pr` skill in this repo; use `gh` directly). No user go-ahead is required for the PR itself. Do NOT re-run review through `pr-coding-loop` / `pr-adversarial-loop` — that would duplicate the Stage 4 review already done. Create the PR with `gh` directly; the merge to `dev` is authorized by the Stage 4 `GOOD_TO_GO` posted in step 4, not by re-entering a review loop.

4. After the PR exists, post the Stage 4 outcome onto it as review markers (same reserved syntax the repo's `pr-review-loop` uses, so downstream tooling parses them):
   - Post a Chinese `AGENT-REVIEW: HUMAN_SUMMARY` comment with the reconciled ranked findings (Critical / Important / Suggestion) and where the two reviewers agreed vs diverged.
   - Then refresh the PR head; **only if its diff content still equals the reviewed diff** (`git diff <base>...<head>` unchanged — a diff-preserving squash keeps it equal), post `AGENT-REVIEW: GOOD_TO_GO` bound to that current head SHA. In this repo `GOOD_TO_GO` **is the merge authorization** that `pr-coding-loop` acts on — posting it marks Stage 4 as passed **and authorizes the auto-merge to `dev`**. Only post it when you intend that outcome. If the **diff content** changed (someone pushed new work, not just a squash), do NOT post GOOD_TO_GO; re-review the new diff first — the authorization must bind a head whose diff content matches what Stage 4 passed.
   - Each comment carries only its own leading `AGENT-REVIEW:` marker; never quote another complete marker in a comment's prose.

If the change is **not** proper (gate red, or an unresolved blocker survived Stage 4), do NOT open the PR and do NOT post GOOD_TO_GO — surface the failure and stop.

Posting `GOOD_TO_GO` authorizes the auto-merge **to `dev` only**. Never merge to `main` and never deploy to production — those remain manual, user-approved actions (see Guardrails).

## Guardrails

- Never dispatch Codex before Stage 2 approval.
- Auto-merge is authorized **only into `dev`**, and only via a Stage 4 `GOOD_TO_GO` posted after review passed on the exact head SHA. Never merge into `main` and never deploy; production actions require explicit user approval per repo rules.
- Each Codex task is write-capable — require a clean tree before Stage 3 and checkpoint after every task, so the invariant holds that the only uncommitted changes are ever the current task's. That invariant is what keeps `git add -A` from committing unrelated work and `git reset --hard HEAD` from destroying it. Verify Codex stayed within the task's declared file scope before each commit.
- You are running inside a git worktree — stay in it; do NOT let Codex create nested worktrees (fresh worktrees lack `node_modules` and break the workspace build).
