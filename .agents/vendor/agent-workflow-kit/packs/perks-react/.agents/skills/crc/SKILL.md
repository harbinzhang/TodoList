---
name: crc
description: Run Codex Relay Compact when the user explicitly invokes $crc or /crc with a change goal. Clarify implementation-changing decisions through a bounded one-question-at-a-time grilling, obtain one shared-understanding confirmation, execute as many small ordered Codex tasks as the goal decomposes into, and finish through the lightweight exact-SHA adversarial PR gate.
---

# CRC

Use `$crc <goal>` or `/crc <goal>`. Keep intake compact and execution gated.

## Preflight and resume

1. Read `.agents/workflows/codex-relay-core.md` and complete only its shared
   preflight.
2. Sanitize the current branch by replacing characters outside
   `[A-Za-z0-9._-]` with `-`. Use
   `tmp/codex-relay/<sanitized-branch>.md` as the gitignored manifest.
3. If that file exists, resume only when its `branch` equals the current branch,
   its `lastCheckpointSHA` equals `git rev-parse HEAD`, and its `goal` exactly
   equals the current invocation's goal text after trimming surrounding
   whitespace. Treat the PR and Git SHAs as authoritative. On any mismatch, do
   not execute the stale tasks; begin intake again and replace the manifest only
   after confirmation.

## Compact grilling

Before asking anything, inspect the repository, instructions, relevant code,
history, and configuration. Never ask the user for a fact that can be discovered
locally.

Ask only decisions that can change implementation, scope, ordering, acceptance,
or safety:

- Ask exactly one question per message.
- Include a recommended answer and its brief rationale.
- Track the count and stop early as soon as the work is decision-complete.
- Ask at most eight user questions. If material ambiguity or real design
  trade-offs remain after question eight, stop and recommend `$codex-relay`
  (full brainstorming and planning) instead of continuing compact grilling.
- Do not edit, run implementation checks, dispatch, commit, push, or open a PR
  before confirmation.

## Synthesis and gate

Present one final shared-understanding synthesis containing:

- the goal;
- all locked decisions;
- an ordered list of acceptance units sized to fully cover the goal, with no
  fixed cap on how many.

Each acceptance unit contains only `id`, `objective`, `files`, `dependencies`,
`acceptanceCriteria`, `verificationCommand`, and `status`. Do not prewrite
implementation code. Keep every unit small, single-purpose, and independently
verifiable no matter how many units the goal needs — that discipline, not a
count ceiling, is what keeps execution light even at large scope.

If the work is one independent unit, recommend ordinary implementation followed
by `$pall` instead of using the relay. A large unit count on its own is never a
reason to stop. Stop instead, before presenting the synthesis, only if the
drafted units reveal the goal actually spans multiple independent subsystems
that each need their own design and acceptance criteria — recommend splitting
into separate `$crc` (or `$codex-relay`) runs, one per subsystem, rather than
folding unrelated subsystems into one synthesis.

Ask the user to confirm the synthesis. That same explicit confirmation authorizes execution; do not add another gate. Any requested change requires a revised synthesis and confirmation.

## Persist and execute

Immediately after confirmation, create the manifest directory and write the
gitignored manifest with:

- `manifestVersion: 1`
- `branch` and `base: origin/dev`
- the exact trimmed invocation `goal` and locked `decisions`
- `startingCheckpointSHA` and `lastCheckpointSHA`
- the complete task contracts and statuses
- targeted verification results
- review cycles and approval SHA as they become known

Do not create or commit separate design documents. Update the manifest after
every task transition, verification, checkpoint, and review cycle.

Pass the confirmed manifest to the remaining sections of
`.agents/workflows/codex-relay-core.md`.

When the final review returns a valid blocker, add it as a new compact relay fix
task rather than editing directly. Any resulting SHA requires a fresh review.
