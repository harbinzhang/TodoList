---
name: cc
description: Run Compact Codex Collaboration when the user explicitly invokes $cc or /cc with a change goal. Clarify implementation-changing decisions through bounded one-question-at-a-time grilling, obtain one shared-understanding confirmation, execute ordered tasks through native Codex collaboration agents, and finish through the lightweight exact-SHA adversarial PR gate.
---

# CC

Use `$cc <goal>` or `/cc <goal>`. Keep intake compact, execution gated, and
all delegation inside the current Codex runtime.

## Preflight and resume

1. Read `.agents/workflows/codex-collaboration-core.md` and complete only its
   shared preflight.
2. Sanitize the current branch by replacing characters outside
   `[A-Za-z0-9._-]` with `-`. Use
   `tmp/codex-collaboration/<sanitized-branch>.md` as the gitignored manifest.
3. If that file exists, resume only when its `branch` equals the current branch,
   its `lastCheckpointSHA` equals `git rev-parse HEAD`, and its `goal` exactly
   equals the current invocation's goal text after trimming surrounding
   whitespace. Treat PR and Git SHAs as authoritative. On any mismatch, do not
   execute stale tasks; begin intake again and replace the manifest only after
   confirmation.

## Compact grilling

Before asking anything, inspect the repository, instructions, relevant code,
history, and configuration. Never ask for a fact that can be discovered
locally.

Ask only decisions that can change implementation, scope, ordering,
acceptance, or safety:

- Ask exactly one question per message.
- Include a recommended answer and its brief rationale.
- Track the count and stop as soon as the work is decision-complete.
- Ask at most eight user questions. If material ambiguity remains after
  question eight, stop and recommend splitting the request.
- Do not edit, run implementation checks, spawn implementation agents, commit,
  push, or open a PR before confirmation.

## Synthesis and gate

Present one final shared-understanding synthesis containing:

- the goal;
- all locked decisions;
- ordered acceptance units.

Each acceptance unit contains only `id`, `objective`, `files`, `dependencies`,
`acceptanceCriteria`, `verificationCommand`, and `status`. Do not prewrite
implementation code.

Keep acceptance units compact enough for a single native Codex implementation
agent to complete and verify. If the scope cannot be expressed as concrete
ordered acceptance units, stop and recommend splitting the request.

Ask the user to confirm the synthesis. That same explicit confirmation
authorizes execution; do not add another gate. Any requested change requires a
revised synthesis and confirmation.

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
`.agents/workflows/codex-collaboration-core.md`.

When the final review returns a valid blocker, add it as a new compact fix task
and delegate it through a fresh native Codex implementation agent. Any resulting
SHA requires a fresh review.
