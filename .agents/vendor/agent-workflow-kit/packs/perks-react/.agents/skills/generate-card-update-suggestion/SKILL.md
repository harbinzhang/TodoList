---
name: generate-card-update-suggestion
description: Research the latest public benefits for a specific existing credit card, using the repo's Google Search grounding script, then prepare or create a pending cardUpdateSuggestions document for admin review. Use when the user asks to check a card's current benefits, detect benefit/cadence changes, or generate a Suggest Update/admin review item for one or a small set of cards.
---

# Generate Card Update Suggestion

Use this skill to turn an existing card into an admin-reviewable `cardUpdateSuggestions` entry through the existing grounded-search script:

`exp/functions-scripts/generate-card-suggestions-from-search.ts`

## Safety

- Default to dry-run. Do not pass `--fix` until the user explicitly asks to write/create/submit the suggestion after seeing the dry-run result.
- Treat production Firestore writes as admin data changes. If credentials fail, stop and report the failure.
- Do not approve, reject, acknowledge, or edit existing suggestions from this skill.
- Do not use deprecated scripts as active guidance.
- If the card already has a pending system suggestion, report the skip reason instead of creating a duplicate.

## Inputs

Accept any of:

- card id, for example `amex-platinum`
- display name, for example `The Platinum Card from American Express`
- a short list of cards

If only a display name is supplied, resolve the existing card id from the repo catalog first:

```bash
rg -n '"displayName": ".*<card name>|"issuer": ' src/data/card-products/cards
```

Then verify the script's dry-run result; the script reads the live `cards/{cardId}` doc and will fail if the id is not present in Firestore.

## Workflow

1. Create a temporary CSV outside the repo unless the user asks to keep an artifact:

   ```csv
   cardId,displayName
   amex-platinum,The Platinum Card from American Express
   ```

2. Run a dry-run first from the repo root:

   ```bash
   npx tsx exp/functions-scripts/generate-card-suggestions-from-search.ts --input /tmp/card-update-suggestion.csv --limit 1 --concurrency 1
   ```

3. Choose the update mode:

   - default: cadence-only; safest for reset-frequency/cadence corrections
   - `--full-update`: replace the card's parsed multipliers and benefits with grounded-search output; use only when the user asks for a full benefit refresh
   - `--delete-only`: remove existing non-welcome benefits not found in the grounded output; use only when the user specifically asks to check removed benefits

4. Review the dry-run output:

   - `success`: report source count and number of changed benefits/multipliers
   - `skipped`: explain the reason, especially `pending_system_suggestion_exists`, `no_cadence_changes_detected`, or `no_deletions_detected`
   - `failed`: report the script error and stop

5. If the dry-run is acceptable and the user explicitly asks to submit/write the suggestion, rerun with `--fix` and a stable submitter:

   ```bash
   npx tsx exp/functions-scripts/generate-card-suggestions-from-search.ts --input /tmp/card-update-suggestion.csv --limit 1 --concurrency 1 --fix --submitted-by-user-id system
   ```

   Preserve the same mode flag used in dry-run.

6. After `--fix`, confirm whether the script wrote, skipped, or failed. If it wrote successfully, tell the user the suggestion is pending in the admin Card Update Suggestions queue.

## Reporting

Report concisely:

- card id and display name
- mode used
- dry-run result
- whether a pending `cardUpdateSuggestions` doc was written
- any warnings or skip/failure reasons

Use Chinese for the report when the user's prompt is Chinese.
