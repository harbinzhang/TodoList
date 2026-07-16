---
name: refactor-safety
description: Use when reviewing or preparing a consolidation refactor (N/M-series — moving a symbol duplicated across frontend/functions/shared into a single owner) to prove it is behavior-preserving before merge.
---

# Refactor-Safety Gate

Proves consolidation refactors are behavior-preserving. Spec:
`docs/superpowers/specs/2026-07-07-refactor-safety-gate-design.md`.

## When to use
A PR that moves a constant/enum/module duplicated across runtimes into a single
owner (usually `packages/shared-runtime`), deletes the copies, re-vendors, adds a
test. NOT for feature or intentional-behavior-change PRs.

## Procedure

### 1. Populate the manifest
Edit `refactor-manifest.json` — one entry per consolidated symbol:
`{ symbol, singleSource, replaces[] }`. See `refactor-manifest.schema.md`.

### 2. Run the mechanical gate
`npm run refactor:safety` — fails on stale vendor, orphaned duplicate, missing
parity test, or a failing delegated `contracts:check` / `boundaries:check`.

### 3. Behavior-preservation proof (required)
- **(A) Transient equivalence test — mandatory.** Before deleting the copies, add
  a test importing BOTH the old copies (pre-delete import or `git show base:path`
  fixture) and the new single source; assert deep-equal over the full value set.
  Green ⇒ delete copies (and, for static values, the transient test).
- **(C) Committed snapshot — additionally required for cross-runtime/public
  contracts.** Freeze pre-refactor values as a committed fixture; a permanent test
  asserts the single source matches it.
- **(B) Git-archaeology only — fallback.** Allowed ONLY when values are
  non-serializable/behavioral and a real test is infeasible; requires written
  justification in the PR.

### 4. Semantic checklist
- [ ] Drift-canary present: every consumer of a consolidated id-vocabulary THROWS
      on unknown values (no silent fallback), with a test asserting the throw.
- [ ] Migration completeness: no re-export, dynamic reference, or string-keyed
      lookup still points at a deleted copy (corroborate the script's grep by hand).
- [ ] Blast-radius / rollback: one line on who consumes this and whether revert is clean.

### 5. Promote into the permanent registry (same PR)
Consolidation is durable only if it is promoted before merge:
- Add the entry to `scripts/refactor-safety-registry.json` with a `proofTest` pointing at
  the step-3 proof test. See `scripts/refactor-safety-registry.schema.md`.
- Add a row for the symbol to `docs/refactor-safety-ledger.md`.

The standing suite (`npm test`, via `scripts/__tests__/refactor-registry.test.mjs`) enforces
`manifest ⊆ registry`, that every `proofTest` exists, and that every symbol has a ledger row —
so a staged-but-unpromoted entry fails CI.

### 6. Reset
After merge, reset `refactor-manifest.json` to `{ "entries": [] }`.
