---
name: staging-tracker-verification
description: Validate the staging tracker and tracking-creation flow by running remote staging E2E coverage, inspecting staging Firestore state, optionally creating a staging test userCard to verify tracking docs, checking used/unused persistence, and cleaning up any temporary staging records afterward.
---

# Staging Tracker Verification

Canonical workflow doc: `.agents/workflows/staging-tracker-verification.md`

Use this skill when the user asks to verify the tracker flow in staging, confirm tracking docs are created correctly after adding a card, inspect or manipulate staging tracker records, or run a staging regression pass for benefit tracking behavior.

For the default post-deploy staging gate, use `staging-qa` instead. This skill is the deeper tracker-specific escalation path.

## Safety

- This skill is for staging only. Do not point it at production without explicit user approval.
- Default to read-heavy verification first.
- If you create temporary staging records, always clean them up before finishing unless the user explicitly asks to keep them.
- Treat `.env.staging` as the source of truth for the remote staging E2E account and expected staging configuration.

## Execution

1. Load `.agents/workflows/staging-tracker-verification.md`.
2. Run the remote staging Playwright suite first.
3. If staging E2E is blocked by invalid credentials, verify the Auth user and repair the staging test password from `.env.staging`, then rerun the suite.
4. Perform a manual Firestore verification pass:
   - inspect the staging test user
   - confirm starting wallet/tracking state
   - add a temporary shared `userCard` with trackable benefits
   - verify trigger-created `userCardBenefitsTracking` docs
   - mark one tracking row used and confirm persistence fields
5. Clean up any temporary staging `userCards` and tracking docs created during the verification pass.
6. Report the automated results, manual verification results, cleanup status, and any residual risks.

## Outputs

- Staging E2E result summary
- Staging Firestore verification summary
- Temporary records created and cleaned up
- Any blockers, data quirks, or follow-up actions
