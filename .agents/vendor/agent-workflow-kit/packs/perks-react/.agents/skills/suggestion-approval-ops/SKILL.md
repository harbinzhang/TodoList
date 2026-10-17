---
name: suggestion-approval-ops
description: "Safely run the end-to-end cardUpdateSuggestions operation across Staging and Production: generate or freeze a batch, pause for Admin review, approve each Staging suggestion, audit its catalog and benefit tracking effects, preflight Production drift, require explicit Production confirmation, then promote, approve, audit, resume, and summarize. Use when the user asks to approve, monitor, batch, promote, or repeat card suggestion updates between environments."
---

# Suggestion Approval Ops

Use this skill as the single entry point for the full suggestion lifecycle. Read and follow the canonical workflow at `.agents/workflows/suggestion-approval-ops.md` before running any command.

## Non-negotiable gates

- Use `perkly-staging-7dab8` as Staging and `perks-react` as Production.
- Freeze exact suggestion IDs and source hashes in a manifest before approval.
- Stop after creating or selecting Staging pending suggestions. Resume only after the Admin review is explicitly approved.
- Approve one suggestion at a time and run `$suggestion-approval-tracking-audit` immediately afterward. Continue only on terminal `PASS`.
- Run a complete Production preflight before any Production write. Stop the whole batch for partial drift, ambiguous multiplier state, collision, source drift, or missing replacement decisions.
- Require a second explicit Production confirmation. `apply-production` needs both `--fix` and `--confirm-production-write`.
- Once Production is confirmed, create each pending suggestion with the same ID, then approve and audit it sequentially. There is no second pending-review pause.
- Never turn `NEEDS_ATTENTION`, `UNKNOWN`, a watch timeout, or execution failure into a pass.

## Routing

- Use `$generate-card-update-suggestion` for grounded card research details.
- Use `$firestore` for ADC and project-safety conventions.
- Use `$suggestion-approval-tracking-audit` for the exact-one read-only audit semantics.
- Do not replace the canonical approval backend with browser automation or direct catalog writes.

## Output

Keep the manifest, per-environment audit JSON files, generator report, and `summary.md` together in the run directory. Report the environment, current phase, completed/skipped/blocked suggestions, product findings, human-review items, execution errors, and exact artifact paths.
