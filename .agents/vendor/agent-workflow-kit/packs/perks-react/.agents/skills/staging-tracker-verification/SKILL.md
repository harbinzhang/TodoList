---
name: staging-tracker-verification
description: Validate staging tracking derivation with the standard namespaced verifier, deterministic candidate comparison, used-state persistence, exact active-slot restoration, and guaranteed cleanup.
---

# Staging Tracker Verification

Canonical workflow doc: `.agents/workflows/staging-tracker-verification.md`

Use this skill when the user asks to verify the tracker flow in staging, confirm tracking docs are created correctly after adding a card, inspect or manipulate staging tracker records, or run a staging regression pass for benefit tracking behavior.

For the default post-deploy staging gate, use `staging-qa` instead. This skill is the deeper tracker-specific escalation path.

## Safety

- This skill is for staging only. Do not point it at production without explicit user approval.
- Use only the fixed `xic9967+staging-e2e@gmail.com` account; never fall back to
  the retired account.
- Do not manually widen cleanup. The standard verifier owns only its
  collision-safe, run-ID-derived card ID and nickname.
- Do not bypass or delete an active fixed-account staging-QA lease. An orphaned
  lease requires explicit process inspection, then the exact same run ID with
  `--recover`; recovery must use the lease's durable snapshot and ownership
  check. Never delete the temporary card until its successful create trigger
  has written the exact lease acknowledgement.
- Treat trigger cleanup, exact display-order restoration, or fixed-account
  user-profile restoration failure as a hard stop.

## Execution

1. Load `.agents/workflows/staging-tracker-verification.md`.
2. Run `npm run staging:verify:tracker -- --run-id <ship-run-id>`.
3. If that exact run was interrupted and its verifier is no longer active,
   rerun with `--recover`; never recover another run's lease.
4. Inspect the generated report and require its cleanup section to pass.
5. If broader user journeys also changed, run the remote staging Playwright
   lane separately through `staging-user-journey-verification`.
6. Report the standard verifier result, report path, exact baseline restoration,
   and any blocker.

## Outputs

- Standard staging tracker verifier result and report path
- Production-derived expected/observed tracking summary
- Temporary records and exact baseline restoration
- Any blockers, data quirks, or follow-up actions
