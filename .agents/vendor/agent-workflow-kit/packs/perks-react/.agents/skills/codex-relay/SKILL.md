---
name: codex-relay
description: Use when the user wants Claude to brainstorm and plan a change under a single design-approval gate, then hand each task to the OpenAI Codex executor with checkpoint commits and finish through the lightweight exact-SHA adversarial PR gate. Trigger on "codex-relay", "relay to codex", "plan then let codex build it", "let codex execute the tasks", "codex as executor", or $cr.
---

# Codex Relay

Keep the existing planning-first relay: **brainstorm + confirm → write tasks → execute**.

## Preflight

Read `.agents/workflows/codex-relay-core.md` and complete only its shared
preflight. Stop on any failed precondition.

## Planning intake

1. Invoke `superpowers:brainstorming` to agree on intent, requirements,
   constraints, and design without editing code. Follow its process as
   written, including its own mandatory design/spec approval gate — do not
   shortcut or duplicate it. That approval is this workflow's single
   confirmation: it both validates the design and authorizes Codex Relay to
   execute the tasks decomposed from it. Do not add any further approval step
   before or after it.
2. Once the spec is approved, invoke `superpowers:writing-plans` to decompose
   it into an ordered task list. Each task must follow the shared core's task
   contract, remain independently verifiable, and precede anything that
   depends on it. When writing-plans asks which execution approach to use,
   answer it directly yourself: Codex Relay always dispatches through
   `codex:codex-rescue`, so there is no user decision to collect there.
3. Keep the task list in the conductor's scratchpad. Codex receives a
   self-contained task prompt and never relies on that document. Share the
   task list with the user as the confirmed plan's breakdown, but do not
   re-request approval for it — the approved spec already authorizes
   execution, and the task list is its direct decomposition.

## Scope guard

If decomposition surfaces a task that does not map to any requirement in the
approved spec, stop and surface that gap to the user before dispatching it
rather than silently expanding scope beyond what was approved.

After the spec approval and task decomposition above, normalize the task list
into the shared relay manifest, record the starting SHA, and follow the
remaining instructions in `.agents/workflows/codex-relay-core.md`.

Never dispatch Codex before the spec approval in step 1.
