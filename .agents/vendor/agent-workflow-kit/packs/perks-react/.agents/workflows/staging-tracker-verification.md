---
description: Verify the deployed staging tracker derivation and cleanup contract
---

# Staging Tracker Verification

Use this workflow after changes to benefit cadence, deadline/date normalization,
`userCards`, `userCardBenefitsTracking`, deterministic tracking IDs, active
tracking slots, or trigger-generated tracker rows.

## Prerequisites

- Staging is deployed and the deployed build marker has already passed.
- `.env.staging.local` contains the fixed
  `xic9967+staging-e2e@gmail.com` credentials.
- Application Default Credentials can read and write the staging Firebase
  project `perkly-staging-7dab8`.
- Never fall back to `xic9967@gmail.com`.

## Automated Gate

Run the standard verifier from the release worktree, passing the current ship
run ID so its report joins the checkpoint:

```bash
npm run staging:verify:tracker -- --run-id "$SHIP_RUN_ID"
```

The verifier:

- signs in as the fixed staging E2E account and confirms the Auth/Firestore
  identity;
- acquires the fixed account's Firestore staging-QA lease before cleanup or
  display-order mutation, and fails closed if another verifier owns it;
- derives a collision-safe card ID and nickname from the exact run ID plus a
  SHA-256 suffix, then removes only a stale card with that exact ID, user, and
  nickname;
- snapshots the fixed account's complete `userCards` IDs and `displayOrder`
  values, all tracking IDs, and the exact presence/value of
  `walletCardCount`, `starredBenefitKeys`, and `hiddenBenefitKeys`;
- durably arms that full recovery snapshot inside the owned Firestore lease
  before any stable `displayOrder` mutation;
- selects an existing stable wallet product that produces current candidates;
- uses production `buildCurrentTrackingCandidates` to compute the exact
  expected set, so disabled welcome benefits and `always` benefits are not
  hard-coded into a count;
- reserves an active slot with valid non-negative display orders, creates one
  namespaced temporary card, and polls the deployed trigger;
- requires that exact card's successful create trigger to acknowledge
  completion in the owned lease after all onboarding/tracking side effects;
  the trigger transactionally claims the exact card/event before side effects,
  so concurrent at-least-once deliveries cannot both run; failed claims expire
  only after a window longer than the trigger runtime so a legitimate retry
  can take over, while still-running claims retain the card and recovery
  evidence instead of allowing premature cleanup;
- compares deterministic ID, cadence period, ET-normalized deadline, initial
  used state, and auto-enrollment state for every candidate;
- writes and reads back used state on the same tracking document;
- deletes only the namespaced temporary card in a `finally` block, then waits
  for the deployed delete trigger to remove its tracking rows and converge the
  wallet counter instead of masking trigger cleanup with direct deletes;
- restores every affected original `displayOrder` exactly, including absent
  fields, and restores the captured user-profile fields exactly, including
  originally absent fields; and
- releases the staging-QA lease only after cleanup and restoration complete;
  if the process is interrupted, preserves the lease and recovery snapshot
  instead of discarding the only restoration evidence; and
- fails unless the original card IDs, tracking IDs, counts, display orders,
  and captured user-profile fields remain stable across repeated polls.

The default report is:

```text
.firebase/ship-runs/<run-id>/reports/staging-tracker-verification.json
```

## Failure Policy

Hard stop for product assertions, trigger timeouts, Firestore permissions,
decode/data-contract failures, fixed-account drift, or cleanup/restoration
failure. Do not widen cleanup beyond the verifier namespace and do not switch
to the retired account.

If the failure is only missing ignored local env/config, check the main
worktree for `.env.staging.local`, sync only the required ignored values
without logging them, and retry once. Do not put passwords, tokens, API keys,
or credential values in the checkpoint or report.

If the same run was interrupted and left its lease behind, inspect that no
tracker verifier process is still active, then use the ownership-checked
recovery path:

```bash
npm run staging:verify:tracker -- --run-id "$SHIP_RUN_ID" --recover
```

Recovery is accepted only for the exact run ID and unchanged lease token. It
transactionally blocks new create-trigger claims before deleting an existing
temporary card. A completed trigger may recover immediately; an unclaimed
delayed delivery is blocked before it can start; and a failed claimed delivery
may recover only after its 15-minute claim window (longer than the platform
trigger runtime) expires. An unexpired claim hard stops with its safe retry
time. Recovery then records cleanup intent in the lease, waits for deployed
delete-trigger cleanup, restores the durable display-order and user-profile snapshot,
verifies the persisted baseline across repeated polls, and atomically releases
the old lease before starting a new verification. Never use `--recover` for a
different run or to overlap a live verifier.

## Report

Record the run ID, report path, selected source card ID, expected row count,
used-state document ID, cleanup result, and final baseline counts. Do not log
credential values or full account data.
