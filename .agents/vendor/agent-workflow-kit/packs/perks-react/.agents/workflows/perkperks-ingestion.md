---
description: End-to-end workflow for comparing PerkPerks against Firestore, verifying diffs, building missing cards, sourcing card art, and promoting the result through staging
---

# PerkPerks Ingestion

Use this workflow when PerkPerks is the upstream source for:

- benefit drift comparison against Firestore
- suggestion generation for existing cards
- missing-card discovery and deduplication
- new card product draft generation
- card art discovery
- staging rollout before production

This workflow is canonical for the PerkPerks ingestion path. Script-specific command syntax still lives in `exp/functions-scripts/README.md`, but the decision flow and safety rules belong here.

## Preconditions

- Firestore production access has been explicitly approved before any production read or write
- Staging access and admin upload access are available
- Card product JSON and image changes in the repo are understood and reviewed
- For any Firestore script, follow `.agents/workflows/run-firestore-script.md`

## Hard Stops

Stop and report instead of continuing when:

- card matching is low-confidence and needs human review
- grounded verification cannot find trustworthy evidence
- card art source is likely the wrong card
- staging upload rejects JSON schema
- staging `/cards/add` cannot find uploaded cards
- staging card images return non-`200`

## Phase 1: Compare PerkPerks vs Firestore

Goal: identify card-level and benefit-level diffs without writing Firestore.

Use:

```bash
cd functions
npx ts-node --project tsconfig.json ../exp/functions-scripts/compare-perkperks-firestore.ts
```

Outputs:

- `summary.json`
- `card-diff.csv`
- `benefit-diff.csv`
- `manual-review.csv`
- `play.md`

Decision rules:

- accept exact matches immediately
- allow high-confidence fuzzy matches only above the configured threshold
- route low-confidence rows to manual review
- treat `RETIRED` source benefits as informational by default, not automatic adds

## Phase 2: Verify Existing-Card Diffs

Goal: avoid trusting PerkPerks blindly for benefit changes.

Use:

```bash
cd functions
npx tsx ../exp/functions-scripts/verify-diff-with-grounded-search.ts
```

Outputs:

- `verified-diff.csv`
- `verify-summary.json`
- `verified-play.md`
- `suggestion-candidates.json`

Verification policy:

- `add` and `update` may proceed when grounded verification is trustworthy
- `remove` is higher risk and should require stronger evidence
- if delete evidence is weak, downgrade to `review`
- prefer official issuer evidence over editorial sources

Write policy:

- default is read-only
- only use `--fix` after reviewing the dry-run result
- only generate `cardUpdateSuggestions` for verified rows

## Phase 3: Identify Missing Cards

Goal: split unmatched PerkPerks cards into:

- truly missing cards
- cards that already exist under a different name
- unresolved cards that require human judgment

Use:

```bash
cd functions
npx ts-node --project tsconfig.json ../exp/functions-scripts/export-perkperks-missing-cards.ts
npx ts-node --project tsconfig.json ../exp/functions-scripts/resolve-perkperks-missing-cards.ts
```

Primary outputs:

- `missing-cards-to-add.csv`
- `missing-cards-needs-review.csv`
- `missing-cards-final-to-add.csv`
- `missing-cards-resolved-as-existing.csv`
- `missing-cards-review-resolutions.csv`

Rules:

- do not create duplicate cards when a renamed or variant card already exists
- keep explicit manual resolutions in config-backed artifacts when needed

## Phase 4: Build New Card Drafts

Goal: turn the final missing-card pool into structured card product drafts.

Use:

```bash
cd functions
npx ts-node --project tsconfig.json ../exp/functions-scripts/generate-perkperks-card-build-input.ts
npx tsx ../exp/functions-scripts/enrich-perkperks-card-build-input.ts
npx tsx ../exp/functions-scripts/finalize-perkperks-card-drafts.ts
```

Primary outputs:

- `missing-cards-build-input.json`
- `missing-cards-enriched.json`
- `missing-cards-finalized.json`
- `missing-cards-card-list-additions.json`

Ready-set rules:

- remove welcome offers and non-perk noise before promoting drafts
- confirm `network`, `issuer`, and `rewardProgram` are credible
- only move the ready subset into `src/data/card-products/cards/`

## Phase 5: Source Card Art

Goal: obtain acceptable card art for every ready new card.

Use:

```bash
cd functions
npx tsx ../exp/functions-scripts/discover-perkperks-card-art.ts
```

Canonical image policy:

- follow `card-assets/card-art-ingestion.md`
- final files live in `card-assets/images/cards/`
- filename must match the card id

Source policy:

1. `official_direct`
2. `official_screenshot`
3. `trusted_third_party`

Fallback policy:

- if no better source exists and the image is a confirmed pure card face `>= 200px`, upscale fallback is acceptable

## Phase 6: Register New Cards in Repo

Goal: make the ready card drafts part of the shipped catalog.

Required changes:

- add ready card JSON files to `src/data/card-products/cards/`
- add matching entries to `src/data/card-products/card-list.json`
- add matching card art files to `card-assets/images/cards/`

This phase does not make the cards searchable in the app by itself if the runtime path reads Firestore instead of local static data.

## Phase 7: Staging Rollout

Goal: prove the batch works in hosted staging before production.

Use `.agents/workflows/card-product-staging-rollout.md`.

Summary:

1. deploy staging hosting and card assets as needed
2. upload card product JSON through staging admin
3. verify staging Firestore, `/cards/add`, and card image hosting
4. fix schema, search, or image gaps before considering production

## Phase 8: Production Rollout

Only after staging passes cleanly:

1. repeat the admin upload or approved Firestore write path for production
2. deploy production hosting/card-assets if repo/runtime changes are needed
3. verify production search, images, and any approved suggestion writes

Production remains an explicit step. Do not assume staging success authorizes production writes or deploys.

## Reference

| Purpose | Path |
|---|---|
| Firestore script workflow | `.agents/workflows/run-firestore-script.md` |
| Add-card workflow | `.agents/workflows/add-card.md` |
| Staging rollout workflow | `.agents/workflows/card-product-staging-rollout.md` |
| Card art policy | `card-assets/card-art-ingestion.md` |
| Script command reference | `exp/functions-scripts/README.md` |
