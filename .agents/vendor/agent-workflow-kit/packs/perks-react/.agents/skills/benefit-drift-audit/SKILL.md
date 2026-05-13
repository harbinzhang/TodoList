---
name: benefit-drift-audit
description: Run the read-only userCardBenefitsTracking drift audit and report cadence-aware residuals, or use the user-level aggregate wrapper for one-user tracking investigations
---

# Benefit Tracking Drift Audit

Run the read-only benefit tracking health check and report cadence-aware drift categories that automated repair scripts cannot safely fix without human judgment. This is the periodic check to confirm residual welcome-bonus conflicts, stale `always`-cadence usage, legacy annually-calendar overlap, and orphaned custom-perk trackings.

Invoke when the user asks about:

- "tracking drift", "welcome bonus conflicts", "residual issues"
- "run the drift audit", "any new drift", "audit benefit tracking"
- "are there still conflicts after the repair scripts"
- "look at this user's tracking", "is this user's tracking valid", "any weird tracking for user <uid>"
- "show me whether this user's recent tracking writes are reasonable"

## Execution

### Global / Cohort Audit

1. Default to staging first:

   ```bash
   npm run monitor:benefit-tracking:staging -- --warn-only
   ```

2. Then production:

   ```bash
   npm run monitor:benefit-tracking:prod -- --warn-only
   ```

3. Read the generated JSON at `/tmp/benefit-tracking-health-perks-react.json` (or the staging project variant). The 5 cadence-aware fields to inspect:

   - `summary.onceConflictGroups` + `onceConflicts[]` — `once` welcome bonuses with conflicting `usedAmount` / `usedDate` under the same identity key (often the "8000 vs 100000" shape)
   - `summary.onceMissingAnchorGroups` + `onceMissingAnchor[]` — `once` groups where the parent `userCard` has no `issuedOn`/`createdAt`; canonical period anchor cannot be resolved
   - `summary.alwaysWithUsageDocs` + `alwaysWithUsage[]` — `always`-cadence trackings that carry `usedDate`/`usedAmount`/`redeemedValueUsd`/`autoChecked` (always benefits should not retain usage state)
   - `summary.annuallyCalendarSentinelOverlapGroups` + `annuallyCalendarSentinelOverlaps[]` — a canonical `2026-01-01 → 2026-12-31` row coexists with an old `9999-12-31` sentinel row still carrying `usedDate`
   - `summary.orphanedCustomPerkTrackingDocs` + `orphanedCustomPerkTrackings[]` — custom `perk-card-*` tracking whose `userCardId` is no longer in `userCards`

4. Report findings in this shape:

   ```
   ## Benefit Tracking Drift Audit

   ### Summary
   Scanned N docs. Cadence-aware residuals:
   - once conflicts: X
   - once missing-anchor: X
   - always-with-usage: X
   - annually-calendar overlap: X
   - orphaned custom-perk: X

   ### Items needing human triage
   [per category, list representative entries with identity key + conflicting fields]
   ```

   If all five counts are 0, report a clean status.

### User-Level Aggregate Audit

Use this when the user gives a specific `userId` and wants an answer like
"is this user's tracking currently valid, and were their recent writes
reasonable?" The aggregate wrapper is the canonical entry point for that
question because it combines:

- current-state `benefit-tracking` health
- `once` wrong-period detection
- recent-day `tracking-new` checks
- targeted custom-perk rollout checks

Command:

```bash
npm run monitor:user-tracking:prod -- --warn-only --user-id <uid> --days 7
```

Interpret the aggregate JSON at `/tmp/user-tracking-health-*.json` this way:

- `severity` — overall result across all component checks
- `summary.benefitTrackingFindings` — current-state structural / cadence findings
- `summary.wrongPeriodRows` — current `once` wrong-period rows
- `summary.trackingNewFindingDocs` — recent new-write findings across the ET day window
- `summary.trackingNewHighDays` / `trackingNewWarningDays` — whether any recent day had suspicious writes
- `summary.customPerkAttention` — targeted custom-perk attention signals

When the user asks for specifics, drill into the nested section reports inside
`sections.*`, not by reconstructing ad-hoc Firestore queries first.

## Notes

- **Read-only.** Never run the `exp/functions-scripts/repair-*.ts` scripts from this skill. Those are the separate human-driven remediation path.
- Never modify or delete any Firestore documents from this skill.
- If credentials fail, inform the user and stop — do not attempt alternative queries.
- The same script is included in `npm run monitor:prod:health`, so running this skill is a direct invocation of the same check the daily sweep uses.
