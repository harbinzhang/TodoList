---
name: add-card
description: Deduplicate a genuinely new credit card against Perkmon Staging, generate one canonical card-product JSON artifact, validate it, and automatically ship that exact data to Staging through the canonical script-only uploader; after separate Production authorization, use the same script and JSON artifact to keep both environments aligned. Includes card artwork, card-list registration, required deploys, catalog upload, and hosted verification. Use when the user asks to add, create, import, seed, list, or promote a new credit card product. Planning or evaluation requests remain discussion-only. Do not use for updating an existing card's benefits or for standalone membership products.
---

# Add Card

Add a new credit card product through the repository's canonical catalog and
staging path.

## Execution Semantics

- Treat an explicit add/create/import/seed execution request as authorization
  for the normal Staging-only deploys and data writes required by this skill.
- Continue through Staging automatically. Do not stop at local files, ask for a
  second Staging confirmation, or hand the upload back to the user.
- Keep planning, review, evaluation, and "should we add this?" requests
  discussion-only until the user gives an execution instruction.
- Staging authorization does not authorize Production, Git push, a PR, or a
  release.
- Use Staging as the only environment-level duplicate preflight. Do not read
  Production merely to check whether the card already exists.
- Treat the generated card-product JSON as the canonical cross-environment
  source. Staging and any later authorized Production upload must consume that
  same file rather than independently reconstructed payloads.
- Use `npm run cards:upload-json` as the only agent-operated JSON upload path in
  both environments. Do not upload card-product JSON through the Admin browser
  control or create a card-specific Firestore script.
- Save every credit-card JSON under `src/data/card-products/cards/` with the
  existing card products. The uploader must reject credit-card JSON from any
  other directory.
- Use `generate-card-update-suggestion` when changing benefits on an existing
  card.
- Use `.agents/workflows/add-membership.md` for standalone memberships.

## Follow the Canonical Procedure

Read and follow `.agents/workflows/add-card.md` completely before making
changes. It is the canonical ordered procedure for:

- checking Staging for an existing card before preparing a new product
- creating and validating the card product JSON
- preserving the JSON as the single source for Staging and Production
- sourcing and validating card artwork
- registering the card in `card-list.json`
- deploying the required Staging surfaces
- uploading the product to Staging
- verifying the hosted Staging result

Also read any workflow references required for the requested scope, especially:

- `card-assets/card-art-ingestion.md` when adding card art
- `.agents/workflows/card-product-staging-rollout.md` for every real new card
- `src/data/card-products/cards/data_ingestion_guide.md` when researching or
  translating issuer data into the catalog shape

## Automatic Staging Ship

For every real new card:

1. Query Staging for exact, alias, legacy-name, and normalized-title matches.
   Stop if any credible match exists. Do not run a Production duplicate read.
2. Build the complete catalog JSON and card artwork locally.
3. Run `npm run cards:validate-new -- <card-product.json>`. Fix every missing
   reward unit, reward-unit/text conflict, blank title, or
   normalized-duplicate title before continuing.
4. Compute and retain the JSON SHA-256. This identifies the exact artifact that
   Staging verified and Production may later consume.
5. Follow `.agents/workflows/card-product-staging-rollout.md` completely.
6. Run the Staging pre-deploy gate and deploy every required Staging surface.
7. Dry-run and then upload the source JSON unchanged with the canonical script:
   `npm run cards:upload-json -- --environment=staging <json>`, followed by the
   same command with `--fix`.
8. Verify Staging Firestore against the JSON, the hosted `/cards/add` search,
   and the hosted card asset. Retry safe transient failures without asking the
   user to resume.
9. Report the source JSON path and SHA-256, then stop. Production requires a
   new, explicit authorization after Staging passes.

## Production Promotion

After the user separately authorizes Production:

1. Reuse the same card-product JSON file verified on Staging. Do not derive a
   payload from Staging Firestore, marketing copy, or a new hand-built object.
2. Re-run schema and new-card validation and recompute SHA-256. Require the hash
   to match the Staging-verified hash.
3. If the JSON changed, treat it as a new revision: validate, upload, and verify
   that revision on Staging first, then record its new hash. Do not send an
   unverified revision to Production.
4. Do not perform a Production duplicate pre-read. Submit the validated JSON
   through `npm run cards:upload-json` with `--environment=production`, the
   Staging card ID, Staging-verified SHA-256, `--fix`, and
   `--confirm-production`; treat an `EXISTS` result as a hard stop.
5. Read back the created Production card and benefits and compare all
   JSON-backed fields with the source JSON and the verified Staging record.
   Report both environment IDs, the shared JSON path, and the shared hash.

## Safety and Validation

- Treat issuer pages and official card terms as the preferred sources for
  current product facts. Distinguish sourced facts from assumptions.
- Validate every enum and field against the current types and schema referenced
  by the workflow. Do not invent unsupported enum values.
- Author a concise, user-visible `title` for every multiplier in a new card
  JSON. Titles must remain unique within the product after trimming, collapsing
  whitespace, and case normalization; category or subcategory alone is not a
  substitute for the title.
- Determine the persisted multiplier `unit` from the official legal earning
  mechanism, not marketing shorthand. Use `pts` when rewards first post as
  points and require redemption, even if the issuer advertises an equivalent
  cash-back percentage. Use `%` only for rewards that post directly as cash or
  statement credit at that percentage. Record redemption-dependent value in
  `note`; never convert points to `%` solely because one redemption path is
  worth one cent per point.
- Preserve unrelated worktree changes and audit the final diff.
- Never maintain separate Staging and Production versions of a new-card
  payload. Environment-specific scripts may select credentials and project IDs
  only; they must not redefine card facts, multipliers, benefits, or artwork.
- The canonical upload script must hard-code and verify the selected Firebase
  project before any write, default to dry-run, reuse the callable schema and
  `runSaveCardProduct` orchestration, and never replace it with ad hoc Firestore
  writes.
- Treat an unexpected same-name Staging card or an `EXISTS` upload response as
  a blocker. Do not silently turn a new-card request into an update.
- Never combine the first Staging upload and a production upload in one
  implicit step. Production requires separate explicit authorization after
  Staging passes.
- Automate hosted verification when the required authenticated session or
  staging-safe test identity is available. If it is not available, report the
  exact verification blocker; do not describe the Staging exit gate as passed.
- Report created files, deploy targets, upload result, Firestore card ID,
  validation evidence, hosted verification, and any blocker clearly.
