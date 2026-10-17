---
description: How to add a new credit card to the system
---

# Add a New Credit Card

This workflow covers creating a new card product JSON file and automatically
shipping it to Staging. An explicit execution request to add a card authorizes
the normal Staging-only deploys and catalog write in this workflow; it does not
authorize Production, Git push, a PR, or a release.

## 0. Staging Duplicate Preflight

Before preparing a new product, query Staging project
`perkly-staging-7dab8` for exact, alias, legacy-name, and normalized-title
matches across `displayName` and legacy `name`.

Normalize by removing trademark symbols and punctuation, collapsing whitespace,
comparing case-insensitively, and ignoring a trailing generic `Card`. Stop
before edits, assets, deploys, or uploads when a credible Staging match exists.
If Staging cannot be read, stop and report the blocker.

Staging is the only environment-level duplicate preflight for this workflow.
Do not read Production merely to check whether the candidate exists. Repeat the
Staging query immediately before the Staging write; uploader `EXISTS` remains a
race-condition backstop.

## 1. Create the Card JSON File

Create a new file in `src/data/card-products/cards/` following the naming convention: `{issuer}-{product-name}.json`.

This repo path is mandatory, not just a naming suggestion. The canonical
uploader rejects credit-card JSON stored elsewhere.

Use an existing card as reference (e.g., `amex-gold.json`). The file must
conform to the `CardProduct` interface from
`src/features/admin/types/cardProduct.ts` and
`src/features/admin/schema/cardProduct.ts`.

```json
{
  "name": "Full Card Name",
  "issuer": "Amex | Chase | Citi | Capital One | Discover | Wells Fargo | Bank of America | Barclays | US Bank | Hyatt | Marriott | Hilton | IHG | United | Delta | American Airlines | Alaska Airlines | Southwest | JetBlue | Air Canada | British Airways | Hertz | National | Priority Pass | Costco | Other",
  "network": "Visa | Mastercard | Amex | Discover | Membership",
  "annualFee": 0,
  "cardArtUrl": "/images/cards/{issuer}-{product}.png",
  "rewardProgram": "MR | UR | TYP | Cash Back | Miles | World of Hyatt | Marriott Bonvoy | Hilton Honors | IHG One Rewards | United MileagePlus | Delta SkyMiles | American AAdvantage | Alaska Atmos Rewards | Southwest Rapid Rewards | JetBlue TrueBlue | Air Canada Aeroplan | British Airways Executive Club | Hertz Gold Plus Rewards | National Emerald Club | Priority Pass | Costco Membership | Other",
  "baseValuation": 1,
  "multipliers": [
    {
      "category": "Dining | Travel | Shopping | ...",
      "subcategory": "(optional) Flights | Hotels | ...",
      "value": 4,
      "cap": 25000,
      "unit": "Required: pts | % | $",
      "title": "Required unique user-visible title for a new card",
      "note": "Reward mechanics and redemption-dependent value"
    }
  ],
  "benefits": [
    {
      "title": "Benefit display title",
      "amount": 10,
      "unit": "USD | Points",
      "resetFrequency": "Monthly | Quarterly | Semi-Annually | Annually | One-Time | Per Stay | Per Trip | Calendar Year",
      "category": "Dining | Travel | Shopping | Lifestyle | Entertainment | Insurance | Lounge | Other",
      "type": "Statement Credit | Lounge Access | Free Night | Insurance | Status | Perk | Other",
      "description": "Detailed description of the benefit",
      "merchantTag": "optional-merchant-tag",
      "enrollmentRequired": true,
      "termsUrl": "https://issuer.example/legal/benefits"
    }
  ]
}
```

### Reward Mechanism Rules

Encode how rewards are earned before considering how they can be redeemed:

- Use `unit: "pts"` when the legal terms award points per dollar. This remains
  true when marketing calls a one-cent redemption path “cash back.”
- Use `unit: "%"` only when the reward posts directly as cash or statement
  credit at the stated percentage without first becoming points.
- Keep `baseValuation` as the cents-per-point valuation; it does not change a
  points currency into a percentage.
- When redemption values differ, keep `pts` and explain the best-value path and
  lower-value alternatives in `note`.
- When legal rewards terms and marketing copy differ, legal terms win.

### New-Card Multiplier Title Gate

Every multiplier in a newly added card must include an explicit valid `unit`
and a concise non-empty `title`. Titles must be unique within that product after
trimming, collapsing whitespace, and case normalization. A `%` unit is rejected
when its earning text explicitly describes points. This keeps repeated
categories distinguishable and prevents points from being presented as direct
cash back without changing legacy catalog validation.

Run the dedicated gate before any Staging deploy or upload:

```bash
npm run cards:validate-new -- src/data/card-products/cards/{issuer}-{product}.json
```

Do not continue until it passes. The general card schema intentionally remains
backward compatible with legacy catalog entries whose multiplier titles may be
missing.

### Canonical Cross-Environment Artifact

The JSON file under `src/data/card-products/cards/` is the single source of
truth for this card in both environments:

- upload this file unchanged to Staging
- compute and report its SHA-256 after validation
- preserve its path and hash with the Staging verification evidence
- after separate Production authorization, upload this same file through the
  same canonical card-product schema and save orchestration
- never reconstruct Production card fields from Staging Firestore, research
  notes, or an environment-specific hard-coded object

If any field changes after Staging verification, the JSON becomes a new
revision. Re-run validation, Staging upload, Staging readback, hosted
verification, and SHA-256 capture before Production promotion.

### Identity Field Rules

Keep `issuer`, `network`, and `rewardProgram` separate:

- `issuer` is the product issuer/provider.
- `network` is the payment network for credit cards. Membership products should use `Membership` once that enum value is enabled.
- `rewardProgram` is the loyalty, rewards, or status program where points, benefits, or status accrue.

For co-branded cards, `issuer` and `rewardProgram` are usually different. Example: a Chase Hyatt card should use `issuer: "Chase"` and `rewardProgram: "World of Hyatt"`.

For standalone memberships, use `.agents/workflows/add-membership.md`; those
products live under `src/data/membership-products/`.

## 2. Add Card Art Image

Place the card art image at `card-assets/images/cards/{issuer}-{product}.png`.

- Use a transparent PNG if possible
- Minimum accepted width: `600px`
- Prefer an original source width of `1200px+` before resizing
- If no better source exists, a confirmed pure card face `>= 200px` wide may be used as an `upscaled fallback`
- Follow the canonical sourcing and validation guide at `card-assets/card-art-ingestion.md`

## 3. Register in Card List

Add the new card's filename to `src/data/card-products/card-list.json` and update the count.

## 4. Ship to Staging Automatically

// turbo
1. Follow `.agents/workflows/card-product-staging-rollout.md` completely.
2. Run the Staging pre-deploy gate and deploy the required Staging targets.
3. Repeat the Staging duplicate query and require zero candidates.
4. Dry-run and upload the canonical JSON unchanged through the script-only
   uploader:
   `npm run cards:upload-json -- --environment=staging <json>`, then repeat with
   `--fix`.
5. Verify the Staging Firestore record against the JSON, hosted `/cards/add`
   result, and hosted card artwork automatically.
6. Report the JSON path and SHA-256, then stop and report the Staging result.

Do not upload to production in the same run unless the user separately
authorizes production after Staging passes.

Do not stop after preparing local artifacts and do not ask for another
confirmation before the first Staging upload. Platform permission prompts,
missing credentials, schema failures, duplicate cards, and failed hosted
verification remain real blockers.

## 5. Verify and Report

Use the authenticated browser, a staging-safe test identity, read-only
Firestore checks, and HTTP asset checks as appropriate. Report:

- deployed Staging targets
- upload status and Firestore card ID
- stored card and benefit counts
- enrollment and terms metadata preservation
- hosted `/cards/add` search result
- hosted card-art status or checksum
- canonical JSON path and SHA-256
- blockers that prevent the Staging exit gate from passing

## 6. Promote the Same JSON to Production

Run this section only after the user explicitly authorizes Production.

1. Load the same JSON path reported by the successful Staging run.
2. Re-run `npm run cards:validate-new -- <card-product.json>` and recompute its
   SHA-256.
3. Require the hash to equal the Staging-verified hash. If it differs, return to
   Staging with the new revision before continuing.
4. Do not run a Production duplicate pre-read.
5. Dry-run the canonical uploader:

   ```bash
   npm run cards:upload-json -- --environment=production \
     --expected-sha256=<staging-sha256> \
     --staging-card-id=<id> \
     <json>
   ```

6. After the dry-run passes, repeat the same command with `--fix
   --confirm-production`. The script uses the canonical card-product schema and
   `runSaveCardProduct` orchestration with the Production project explicitly
   asserted.
7. Treat an `EXISTS` response as a blocker; do not convert the run into an
   update.
8. Read back Production and compare the stored card, multipliers, benefits,
   artwork path, and benefit count with the canonical JSON and verified Staging
   record.
9. Report the Staging and Production card IDs, shared JSON path, shared hash,
   and any mismatch.

## AI-Assisted Seeding Policy

AI may draft membership product JSON, but the agent must validate every enum value against `src/features/admin/types/cardProduct.ts`. If AI suggests a provider, network, reward program, benefit cadence, category, or benefit type outside the enum lists, stop and propose an enum expansion instead of writing the product.

Use `.agents/workflows/add-membership.md` and the seeding prompt at
`.agents/prompts/membership-product-seeding.md` for AI-drafted membership
products.

## Reference Files

| Purpose | Path |
|---------|------|
| Card product type | `src/features/admin/types/cardProduct.ts` |
| Card product schema | `src/features/admin/schema/cardProduct.ts` |
| Canonical JSON uploader | `exp/functions-scripts/upload-card-product.ts` |
| Firestore loader | `src/data/card-products/loader.ts` |
| Card JSON catalog | `src/data/card-products/cards/*.json` |
| Card list registry | `src/data/card-products/card-list.json` |
| Membership workflow | `.agents/workflows/add-membership.md` |
| Card art ingestion guide | `card-assets/card-art-ingestion.md` |
| Card product staging rollout | `.agents/workflows/card-product-staging-rollout.md` |
| Admin card editor | `src/features/admin/components/CardProductEditor.tsx` |
| User add-card page | `src/features/cards/pages/AddCardPage.tsx` |
| Data ingestion guide | `src/data/card-products/cards/data_ingestion_guide.md` |
| Membership seeding prompt | `.agents/prompts/membership-product-seeding.md` |
