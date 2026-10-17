---
name: suggestion-approval-tracking-audit
description: Audit the read-only catalog and userCardBenefitsTracking effects of one approved cardUpdateSuggestions record. Use after a card update suggestion is approved, when checking its migration or removal outcome, or when a suggestion-specific post-approval tracking report is needed; run staging first and query production only with explicit user authorization.
---

# Suggestion Approval Tracking Audit

Audit exactly one suggestion ID at a time. This is the post-approval, per-suggestion check; route broad/cohort benefit-tracking drift audits and user-level tracking investigations to `$benefit-drift-audit`.

## Safety and Input

- Require one `--suggestion <suggestion-id>` value. Do not infer, batch, or reuse another suggestion's output.
- Keep this audit read-only. Do not approve or alter a suggestion; repair tracking; archive or delete documents; dispatch a migration; or make any Firestore write.
- Run staging first. Run production only after the user explicitly authorizes a production read.
- Create and retain one JSON report artifact per suggestion per environment. Use the default path only when it is unique for the requested suggestion; otherwise pass a distinct `--report-file` path outside the repo.

## Workflow

1. Run the staging alias first:

   ```bash
   npm run monitor:suggestion-approval-tracking:staging -- --suggestion <suggestion-id> --json --warn-only
   ```

   The command writes `/tmp/suggestion-approval-tracking-audit-perkly-staging-7dab8-<suggestion-id>.json` by default. Report that artifact path and preserve it as this suggestion's staging output.

2. If staging is `PENDING`, optionally wait for the terminal state without changing data:

   ```bash
   npm run monitor:suggestion-approval-tracking:staging -- --suggestion <suggestion-id> --watch --interval-sec 15 --timeout-sec 180 --json --warn-only
   ```

   A watch ending `PENDING` means the timeout elapsed; it does not prove a pass.

3. Before production, obtain explicit user authorization such as “run this suggestion audit in production.” Only then use the production alias:

   ```bash
   npm run monitor:suggestion-approval-tracking:prod -- --suggestion <suggestion-id> --json --warn-only
   ```

   The alias supplies the required `--confirm-production-read` guard. Direct CLI use against `perks-react` must also supply that flag. Its default artifact is `/tmp/suggestion-approval-tracking-audit-perks-react-<suggestion-id>.json`. Never substitute an ad-hoc Firestore query or a staging alias for this production step.

4. Use `--benefit-title <title>` or `--submitted-by <email>` only to confirm a supplied selector. A selector mismatch is an error; stop and report it rather than widening the audit.

## Interpret the Report

Read the saved JSON and report the `verdict`, `classification`, `reasonCodes`, catalog counts, approval archive, migration state and authoritative migration counts, relevant tracking counts, and artifact path.

For approved suggestions with `originalBenefits`, the audit uses the shared approval merge to replay the original-to-suggested delta onto the approval archive. It classifies and scopes the audit from that canonical delta, then compares only suggestion-owned benefit IDs and fields with the live catalog. Unrelated later catalog drift, including optional metadata added to an approval-created benefit, is ignored; a mismatch on a suggestion-owned benefit retains the intended classification and still reports scoped tracking evidence. Removed and mapped-old benefit IDs are also read directly, so a surviving document cannot hide behind a changed `cardId`. A missing legacy `originalBenefits` field falls back to the approval archive snapshot; a present but malformed field fails closed.

Verdicts:

- `PASS` — the checked catalog and required tracking outcome are consistent.
- `PENDING` — the suggestion is pending, or an expected replacement migration is queued, processing, or paused.
- `NOT_APPROVED` — the suggestion was rejected or acknowledged, so it has no approval effect to validate.
- `NEEDS_ATTENTION` — the approval archive, live catalog, removal timing, or migration result needs human triage.
- `UNKNOWN` — the approved change has an unsupported mixed shape, invalid migration mapping coverage, or malformed persisted input; do not guess its migration behavior or normalize the evidence into a pass.

Classifications:

- `MODIFIED_NON_PERIOD` — an existing benefit changed without cadence or expiration change; no migration job should exist, and existing tracking rows are count-only evidence.
- `MODIFIED_PERIOD` — cadence or expiration changed in place; requires human period-reanchor review.
- `PURE_REMOVAL` — benefits were removed; no migration job should exist and no relevant tracking row may appear after approval.
- `PURE_ADDITION` — benefits were added; no migration job should exist, and current tracking rows are reported without claiming holder fanout or requiring legacy rows to match the full current schema.
- `REPLACEMENT` — authoritative migration mappings replace benefits; require the canonical `trackingMigrationJobs/<suggestion-id>` document, one completed conflict-free migration, no source rows remaining, and exactly the expected canonical target rows.
- `OTHER` — no supported simple shape was identified, including an explicit all-skip remove-plus-add decision.

Unmapped removals and additions are supported and audited under their separate removal and addition rules.

Reason codes identify the specific triage condition. Treat `LIVE_CATALOG_MISMATCH`, archive errors, period reanchor review, unexpected or missing migration, migration conflicts, `MIGRATION_COMPLETION_STATE_INVALID`, `MIGRATION_COUNTS_INCONSISTENT`, `MIGRATION_TARGET_LINEAGE_INVALID`, `MIGRATION_TARGETS_INCOMPLETE`, `MIGRATION_TARGETS_EXCESS`, post-approval removal rows, unknown timestamps, and `UNSUPPORTED_MIXED_SHAPE` as reportable findings, never as permission to repair data. Treat `ADDED_BENEFIT_IDENTITY_UNKNOWN` as a fail-closed result when any addition, including a mapped replacement target, cannot be bound uniquely to the approval event by `createdAt`; never substitute a later content/title match or same-ID recreation. Treat `MIGRATION_MAPPING_COVERAGE_INVALID` as duplicate, extra, or non-subset mapping coverage. Treat `MIGRATION_MAPPING_CATALOG_INVALID` as a mapping whose titles or period-defining fields disagree with the archived/live catalog. Treat `SUGGESTION_STATUS_INVALID`, `SUGGESTED_BENEFITS_MALFORMED`, `ORIGINAL_BENEFITS_MALFORMED`, `SUGGESTION_CARD_ID_INVALID`, `APPROVAL_ARCHIVE_BENEFITS_MALFORMED`, `APPROVAL_ARCHIVE_CONTEXT_INVALID`, `MIGRATION_JOB_MALFORMED`, `TRACKING_ROW_MALFORMED`, `TRACKING_MIGRATION_DECISION_MALFORMED`, and `TRACKING_MIGRATION_DECISION_INCONSISTENT` as fail-closed persisted-input findings; report the accompanying `inputIssues` evidence and do not alter data.

## Output

Produce one concise report per suggestion and environment. Include:

- suggestion ID, project/environment, and any supplied selector;
- verdict, classification, and all reason codes;
- catalog, archive, migration, and relevant tracking evidence;
- the exact JSON artifact path; and
- whether production was not run because authorization was absent.

Tracking reads, validation, and counts must stay scoped to benefit IDs changed by this suggestion or named by its authoritative migration mappings. Do not widen a suggestion audit to unrelated benefits on the card.

If credentials, reads, watch polling, or selector checks fail after arguments are valid, preserve the structured failure artifact at the requested report path, report the failure, and stop. Do not retry with writes, alternate projects, or broader queries.
