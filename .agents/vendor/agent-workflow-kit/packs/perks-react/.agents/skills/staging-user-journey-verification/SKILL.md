---
name: staging-user-journey-verification
description: Validate core user journeys against hosted staging with read-only smoke, staging-safe write checks, direct Firestore inspection, and mandatory cleanup of temporary staging records
---

# Staging User Journey Verification

Canonical workflow doc: `.agents/workflows/staging-user-journey-verification.md`

Use this skill when the user asks to verify core user journeys on staging, run staging-safe exploratory validation, inspect or modify staging Firestore as part of a user-flow check, or choose between read-only and read-write staging verification.

This skill is the general staging journey orchestrator:

- use it for broad staging journey validation across auth, dashboard, wallet, tracker, settings, and related core flows
- use `staging-qa` when the user only wants the default fast post-deploy gate
- use `staging-tracker-verification` when the request is specifically about tracker generation, tracking docs, cadence logic, or deterministic tracking IDs

## Safety

- Staging only. Do not point this workflow at production.
- Default to the least invasive mode that can answer the user's question.
- Read-only first unless the user asked for writes, the changed behavior requires writes, or read-only evidence is insufficient.
- Any staging writes must be temporary, attributable, and cleaned up before finishing unless the user explicitly asks to keep them.
- Limit temporary records to the staging E2E user or clearly marked `codex-staging-journey-*` records.
- Never leave staging data in an ambiguous state after exploratory verification.

## Execution

1. Load `.agents/workflows/staging-user-journey-verification.md`.
2. Select the lightest useful mode:
   - `read-only smoke`: `test:e2e:staging:readonly`
   - `default gate`: `staging:qa`
   - `read-write journey verification`: `test:e2e:staging:write` plus direct Firestore verification and cleanup
   - `tracker deep verification`: hand off to `staging-tracker-verification`
3. Run the smallest command set that covers the requested journey.
4. If direct Firestore inspection or writes are needed, follow the shared Firestore workflow and use clearly marked temporary records.
5. Report what was exercised, what was written, what was cleaned up, and any residual risk.

## Outputs

- Mode used and commands run
- Journeys covered and their result
- Firestore collections inspected or modified
- Temporary records created and cleanup result
- Blockers, skips, and residual risk
