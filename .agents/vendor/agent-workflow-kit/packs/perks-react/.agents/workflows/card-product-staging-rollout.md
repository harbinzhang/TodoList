---
description: Automatically deploy, upload, and verify card product JSON and card art on Staging before production
---

# Card Product Staging Rollout

Use this workflow when new or revised card product JSON files should be shipped
to Staging. Once the parent request explicitly authorizes adding a new card, run
this workflow through its exit gate without another Staging confirmation.

This is the canonical workflow for:

- automatic Staging upload of card product JSON
- staging card asset deployment
- staging verification of `/cards/add`
- deciding whether a batch is ready for production

## Preconditions

- the Staging-only duplicate preflight in `.agents/workflows/add-card.md` found
  zero credible candidates; no Production duplicate read is required
- card product JSON is already present under `src/data/card-products/cards/`
- `card-list.json` is updated if the repo catalog should include the new cards
- required images exist under `card-assets/images/cards/`
- Application Default Credentials are available for the canonical uploader

If card JSON or images are not ready yet, finish `.agents/workflows/add-card.md` first.

## Hard Stops

Stop and fix before continuing when:

- upload JSON fails schema validation
- staging Firestore does not contain the uploaded cards
- `/cards/add` cannot find the uploaded cards
- card image URLs return `404`
- uploaded card art is obviously the wrong card
- a same-name card already exists during a new-card request
- the upload script resolves to any Firebase project other than
  `perkly-staging-7dab8`

## Step 1: Prepare Upload Files

The canonical script uploader expects valid card product JSON files.

Rules:

- use the repository JSON as the canonical payload without environment-specific
  card-data overrides
- credit cards must be stored under `src/data/card-products/cards/`; membership
  products must be stored under
  `src/data/membership-products/memberships/`. The uploader enforces the product
  kind and directory pairing.
- every file must satisfy `src/features/admin/schema/cardProduct.ts`
- every genuinely new card must pass
  `npm run cards:validate-new -- <card-product.json>` before deploy or upload;
  this includes explicit reward-unit and multiplier-title checks
- optional numeric fields such as `multipliers[].cap` must be omitted when unknown, not set to `""`
- `cardArtUrl` must point at the final hosted path under `/images/cards/...`
- compute and retain the source JSON SHA-256 for later Production alignment

Upload each source JSON directly. Do not generate a separate environment
payload or temporary hard-coded uploader.

## Step 2: Deploy Required Staging Surfaces

Run the pre-deploy gate, then deploy the smallest complete set of Staging
surfaces needed for the batch. Do this automatically after an explicit add-card
execution request.

Required for every new card:

```bash
npm run check:deploy:staging
npm run deploy:staging:card-assets
```

Also deploy:

- `npm run deploy:staging:admin` when the hosted Admin UI changed
- `npm run deploy:staging:hosting` when public client code changed
- a narrower matching Staging target when functions, rules, indexes, or storage
  changed

Do not use a full Staging deploy when narrower targets cover the diff.

## Step 3: Upload to Staging Automatically

The script is the only canonical JSON upload path for agent workflows. Do not
use the Admin browser upload control and do not create a transient
card-specific script.

Run the read-only duplicate/schema/project gate first:

```bash
npm run cards:upload-json -- --environment=staging <card-product.json>
```

Require `CARD_PRODUCT_UPLOAD_DRY_RUN_OK`, then run the one create-only write:

```bash
npm run cards:upload-json -- --environment=staging --fix <card-product.json>
```

The script hard-codes and asserts `perkly-staging-7dab8`, validates the source
JSON through both card-product and callable schemas, resolves a write-admin UID
without logging identity data, reuses `runSaveCardProduct`, and reads back
`cards` plus `cardBenefits`. An `EXISTS` result is a hard stop; this uploader
never changes scope into an update.

If Application Default Credentials are unavailable, report a credential
blocker and stop.

If upload fails for another reason:

- fix the JSON source files
- retry upload

## Step 4: Verify Firestore

Check that staging Firestore now contains the uploaded cards.

Minimum checks:

- `cards` contains the expected `displayName`
- `cardArtUrl` matches the expected hosted path
- `annualFee`, `network`, rewards, and multipliers match the source
- `cardBenefits` count matches the source
- `enrollmentRequired`, `termsUrl`, cadence, amount, and expiration metadata
  survive the upload
- excluded or expired launch promotions remain absent when applicable
- the uploaded card and benefits match the canonical source JSON

Use read-only Firestore checks from `functions/` following `.agents/workflows/run-firestore-script.md`.

## Step 5: Verify Hosted App

Use the hosted staging app, not local dev, for validation. Perform this
verification automatically; do not leave it as the default user handoff.

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

Prefer an already-authenticated browser session. If browser automation is
unavailable, use an existing staging-safe hosted journey or test identity that
proves the deployed `/cards/add` behavior. Firestore presence alone does not
prove this gate. When no authenticated verification surface is available,
report the exact blocker and do not claim the Staging exit criteria passed.

## Step 6: Fix Staging Issues

Common failures and the expected fix:

- JSON schema rejection:
  - fix source JSON
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
- the canonical JSON path and SHA-256 are recorded for any later Production
  promotion

Only after that should production be considered.

The add-card run stops here by default. Production requires a new explicit
authorization and is never implied by a successful Staging ship.

## Reference

| Purpose | Path |
|---|---|
| Add-card workflow | `.agents/workflows/add-card.md` |
| Deploy workflow | `.agents/workflows/deploy.md` |
| Firestore script workflow | `.agents/workflows/run-firestore-script.md` |
| Canonical JSON uploader | `exp/functions-scripts/upload-card-product.ts` |
| PerkPerks ingestion workflow | `.agents/workflows/perkperks-ingestion.md` |
| Card art policy | `card-assets/card-art-ingestion.md` |
