---
name: multi-cc
description: Plan and finish a multi-PR change through sequential Compact Codex Collaboration units. Use when the user explicitly invokes $multi-cc or /multi-cc with one outcome that must be split into two or more independently mergeable implementation PRs, wants one confirmation for the whole mission, and wants every implementation PR carried through native Codex execution and exact-SHA merge before a final reviewed roadmap closure and cross-PR verification.
---

# Multi-CC

Use `$multi-cc <goal>`, `/multi-cc <goal>`, `$mcc <goal>`, or `/mcc <goal>`.
Use `$multi-cc resume <mission-slug>` or `$mcc resume <mission-slug>` to
continue a previously confirmed mission.

Load `.agents/workflows/multi-cc.md` and follow it exactly.

## Core contract

- Inspect and plan before editing.
- Decompose one outcome into at least two independently mergeable implementation
  PRs, ordered by dependency.
- Give every implementation PR one to four bounded native Codex collaboration
  tasks.
- Present the complete PR graph and ask for one shared-understanding
  confirmation.
- Treat that confirmation as execution authority for every frozen PR unit and
  the final roadmap-closure PR. Do not request routine confirmations between
  units.
- Start every implementation branch from the latest `origin/dev` after all of
  its dependencies are merged. Never use stacked PR bases.
- Run each implementation PR through
  `.agents/workflows/codex-collaboration-core.md`, then through `$pall` for
  exact-head review, verification, approval, and guarded merge.
- Treat the final documentation-only closure as coordinator-owned bookkeeping,
  then give its PR the same `$pall` exact-head gate.
- Keep one roadmap track for the overall mission and record individual PR units
  as top-level checkboxes in its linked mission plan.
- Finish only after all implementation PRs and the closure PR are merged, the
  mission is marked done, and the final cross-PR commands pass.

## Boundaries

If the goal fits one PR, recommend `$cc` instead. If the proposed PRs cannot be
merged independently, revise the boundaries before confirmation.

The mission confirmation does not authorize deployment, release, production
mutation, secret changes, destructive cleanup, or bypassing review. Stop for
material scope changes, new product decisions, unsafe worktree state, external
approval gates, or failures that cannot be resolved within the confirmed unit.

Do not widen `/cc` itself and do not nest independent coordinators. Multi-CC is
the single root coordinator; fresh implementation and review agents remain
bounded to one PR head at a time.
