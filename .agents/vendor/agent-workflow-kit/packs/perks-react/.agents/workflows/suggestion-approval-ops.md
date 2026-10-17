---
description: Generate or freeze card update suggestions, approve and audit Staging, preflight Production, then promote, approve, audit, resume, and summarize with explicit safety gates
---

# Suggestion Approval Ops

## Preconditions

Run from the repository root with Application Default Credentials:

```bash
gcloud auth application-default print-access-token >/dev/null
```

The reviewer email must be in the canonical `ADMIN_WRITE_EMAILS` allowlist and resolvable through Firebase Auth in the environment being written.

Use a stable run directory:

```bash
RUN_DIR=/tmp/suggestion-approval-ops-<run-id>
```

## 1. Generate or freeze Staging pending suggestions

Grounded generation is dry-run by default:

```bash
npm run ops:suggestion-approval -- generate-staging \
  --input /tmp/cards.csv \
  --mode cadence-only \
  --submitted-by-email <admin-email> \
  --run-dir "$RUN_DIR"
```

After reviewing the generator dry-run, explicitly create Staging pending suggestions:

```bash
npm run ops:suggestion-approval -- generate-staging \
  --input /tmp/cards.csv \
  --mode cadence-only \
  --submitted-by-email <admin-email> \
  --run-dir "$RUN_DIR" \
  --fix
```

Alternatively freeze existing Staging suggestions by exact IDs:

```bash
npm run ops:suggestion-approval -- intake-staging \
  --suggestion <id-1> \
  --suggestion <id-2> \
  --status pending \
  --run-dir "$RUN_DIR"
```

Or use selectors:

```bash
npm run ops:suggestion-approval -- intake-staging \
  --submitted-after 2026-07-01T00:00:00Z \
  --submitted-by-user-id <uid> \
  --status pending \
  --limit 100 \
  --run-dir "$RUN_DIR"
```

The selected IDs are sorted, de-duplicated, snapshot-hashed, and frozen in `manifest.json`. Stop at `awaiting_staging_admin_review`. Have the Admin inspect every pending suggestion before continuing.

## 2. Record replacement decisions

When a suggestion removes and adds benefits, create a decision JSON outside the repo:

```json
{
  "<suggestion-id>": [
    {
      "removedBenefitId": "<live-staging-benefit-id>",
      "migrateToAddedTitle": "<exact-added-title>"
    }
  ]
}
```

Set `migrateToAddedTitle` to `null` for an explicit delete without migration. Every removed benefit needs exactly one decision; an added target may be mapped at most once. Missing, duplicate, unknown, or unnecessary decisions block approval.

## 3. Approve and audit Staging

After explicit Admin approval:

```bash
npm run ops:suggestion-approval -- approve-staging \
  --manifest "$RUN_DIR/manifest.json" \
  --reviewer-email <admin-email> \
  --decisions-file /tmp/replacement-decisions.json \
  --fix
```

Omit `--decisions-file` only when the batch contains no remove-plus-add replacement. The runner:

1. verifies each immutable source hash;
2. resolves and allowlist-checks the reviewer through Firebase Auth;
3. calls canonical `runApproveCardUpdateSuggestion`;
4. writes the item checkpoint;
5. runs the exact-one tracking audit with a 15-second interval and 180-second watch timeout;
6. stops before the next approval unless the verdict is terminal `PASS`.

Successful completion ends at `staging_passed`.

## 4. Preflight Production

Production preflight is read-only:

```bash
npm run ops:suggestion-approval -- preflight-production \
  --manifest "$RUN_DIR/manifest.json" \
  --confirm-production-read
```

Each item becomes:

- `ready_to_promote`: every suggestion-owned target value still matches the original snapshot;
- `already_satisfied`: every intended value is already present exactly, so the item will be skipped;
- `blocked`: partial application, conflicting additions, missing/duplicate benefits, multiplier drift/duplicates, card absence, source drift, cross-project card-art changes, or another ambiguity.

Any blocked item blocks the entire batch before Production writes. A clean preflight stops at `awaiting_production_confirmation`; present the manifest and summary to the user and wait for explicit Production approval.

Card-art changes are deliberately blocked because a Staging Storage path cannot be safely re-hosted by the Production approval backend. Promote the asset through a dedicated reviewed workflow before retrying; never allow approval to silently drop the image diff.

## 5. Apply and audit Production

After explicit Production confirmation:

```bash
npm run ops:suggestion-approval -- apply-production \
  --manifest "$RUN_DIR/manifest.json" \
  --reviewer-email <admin-email> \
  --fix \
  --confirm-production-write
```

The runner rechecks source and Production state immediately before every write. It creates `cardUpdateSuggestions/<same-staging-id>` with `create()` semantics, resets review lifecycle fields, adds Staging provenance to `reviewNotes`, calls the canonical approval backend, and runs the exact-one Production audit. It stops on the first non-`PASS`.

An interrupted run may be resumed with the same command and manifest. Exact completed items are skipped; an approved-but-not-audited item resumes at audit. ID collisions or ambiguous state never auto-repair.

## 6. Status and reporting

```bash
npm run ops:suggestion-approval -- status \
  --manifest "$RUN_DIR/manifest.json"
```

Retain:

- `manifest.json`
- `generator-report.json`, when generation was used
- `audit-staging-<suggestion-id>.json`
- `audit-production-<suggestion-id>.json`
- `summary.md`

The summary separates product issues, human-review items, and execution errors. `blocked` is a hard stop, not a completed run.
