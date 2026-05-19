---
description: Promote card product JSON and card art through staging using the admin upload flow, then verify Firestore, add-card search, and hosted card assets before production
---

# Card Product Staging Rollout

Use this workflow when new or revised card product JSON files should be promoted through staging first.

This is the canonical workflow for:

- staging admin upload of card product JSON
- staging card asset deployment
- staging verification of `/cards/add`
- deciding whether a batch is ready for production

## Preconditions

- card product JSON is already present under `src/data/card-products/cards/`
- `card-list.json` is updated if the repo catalog should include the new cards
- required images exist under `card-assets/images/cards/`
- staging admin access is available

If card JSON or images are not ready yet, finish `.agents/workflows/add-card.md` first.

## Hard Stops

Stop and fix before continuing when:

- upload JSON fails schema validation
- staging Firestore does not contain the uploaded cards
- `/cards/add` cannot find the uploaded cards
- card image URLs return `404`
- uploaded card art is obviously the wrong card

## Step 1: Prepare Upload Files

The admin upload path expects valid card product JSON files.

Rules:

- every file must satisfy `src/shared/schema/card-product.ts`
- optional numeric fields such as `multipliers[].cap` must be omitted when unknown, not set to `""`
- `cardArtUrl` must point at the final hosted path under `/images/cards/...`

Recommended pattern:

- build a temporary upload folder with only the JSON files for the current batch
- include a manifest for humans if useful, but do not upload the manifest itself

## Step 2: Deploy Staging Surfaces

Deploy the frontend and card asset hosting needed for the batch.

Typical commands:

```bash
npm run check:deploy:staging
npm run deploy:staging:hosting
npm run deploy:staging:card-assets
```

Use full staging deploy only when functions/rules/storage also changed.

## Step 3: Upload Through Staging Admin

Admin upload URL:

- `https://perkmon-staging.web.app/admin/cards`

Use the `Upload Product` control on the card admin page.

Behavior:

- new cards create `cards` and `cardBenefits`
- existing cards trigger the existing-card update flow
- schema-invalid files are rejected before write

If upload fails:

- fix the JSON source files
- regenerate any staging upload bundle
- retry upload

## Step 4: Verify Firestore

Check that staging Firestore now contains the uploaded cards.

Minimum checks:

- `cards` contains the expected `displayName`
- `cardArtUrl` matches the expected hosted path
- `cardBenefits` exists for cards that should have benefits

Use read-only Firestore checks from `functions/` following `.agents/workflows/run-firestore-script.md`.

## Step 5: Verify Hosted App

Use the hosted staging app, not local dev, for validation.

Minimum checks:

1. open `https://perkmon-staging.web.app`
2. reach `/cards/add`
3. search for representative cards from the batch
4. confirm the cards appear in results
5. confirm card images load

Recommended sample coverage:

- at least one card per major issuer in the batch
- cards with newly added art
- cards whose names include abbreviations or punctuation such as `AmEx`, `U.S.`, `®`, or `™`

## Step 6: Fix Staging Issues

Common failures and the expected fix:

- JSON schema rejection:
  - fix source JSON
  - regenerate upload bundle
  - re-upload
- card searchable in Firestore but not in `/cards/add`:
  - inspect search normalization and fuzzy matching
  - deploy staging hosting again
- card present but image `404`:
  - add the missing PNG to `card-assets/images/cards/`
  - redeploy staging card-assets
- wrong image:
  - replace the asset source
  - redeploy staging card-assets

## Step 7: Exit Criteria

Staging is considered good for the batch only when all are true:

- uploaded cards exist in staging Firestore
- representative `/cards/add` searches succeed
- required card images return `200`
- no known batch-level blocker remains

Only after that should production be considered.

## Reference

| Purpose | Path |
|---|---|
| Add-card workflow | `.agents/workflows/add-card.md` |
| Deploy workflow | `.agents/workflows/deploy.md` |
| Firestore script workflow | `.agents/workflows/run-firestore-script.md` |
| PerkPerks ingestion workflow | `.agents/workflows/perkperks-ingestion.md` |
| Card art policy | `card-assets/card-art-ingestion.md` |
