---
description: How to add a new membership product to the shared card catalog
---

# Add a New Membership Product

This workflow covers creating a shared catalog membership product JSON file and
uploading it through the same card-product pipeline used by credit cards.

Membership products reuse the existing `CardProduct` contract and admin upload
path, but source JSON files live in `src/data/membership-products/` so the repo
catalog keeps credit cards and standalone memberships separate.

Do not create a separate Firestore collection or upload loader for v1.

## 1. Create One JSON File Per Membership Status

Create one file in `src/data/membership-products/memberships/` for each concrete
membership/status product.

Use kebab-case names that include the provider, program, and status:

```text
src/data/membership-products/memberships/hyatt-world-of-hyatt-discoverist.json
src/data/membership-products/memberships/hyatt-world-of-hyatt-explorist.json
src/data/membership-products/memberships/hyatt-world-of-hyatt-globalist.json
```

Do not model tiers as fields. `World of Hyatt Discoverist`,
`World of Hyatt Explorist`, and `World of Hyatt Globalist` are three separate
catalog products.

## 2. Use The Membership Product Shape

Every membership product must use the existing card product JSON shape with
membership-specific identity values:

```json
{
  "name": "World of Hyatt Globalist",
  "issuer": "Hyatt",
  "network": "Membership",
  "annualFee": 0,
  "cardArtUrl": "/images/cards/hyatt-world-of-hyatt-globalist.png",
  "rewardProgram": "World of Hyatt",
  "baseValuation": 1.7,
  "cardKind": "membership",
  "multipliers": [
    {
      "category": "Travel",
      "subcategory": "Hotel",
      "value": 30,
      "unit": "%",
      "title": "30% Bonus Points",
      "description": "Earn 30% bonus points on eligible Hyatt stays."
    }
  ],
  "benefits": [
    {
      "title": "Complimentary Breakfast",
      "amount": 0,
      "unit": "USD",
      "resetFrequency": "Always",
      "category": "Travel",
      "type": "perk",
      "description": "Complimentary breakfast at participating Hyatt properties."
    }
  ]
}
```

Required identity rules:

- `cardKind` must be `"membership"`.
- `network` must be `"Membership"`.
- `annualFee` should be `0` unless the membership itself is a paid annual plan.
- `issuer` is the provider brand, such as `"Hyatt"`, not `"World of Hyatt"`.
- `rewardProgram` is the loyalty/status program, such as `"World of Hyatt"`.
- `issuer`, `network`, and `rewardProgram` must all come from
  `src/features/admin/types/cardProduct.ts`.

## 3. Model Benefits With Existing Fields

Use the existing benefit and multiplier fields only.

- Persistent status perks use `"resetFrequency": "Always"`.
- Non-monetary perks use `"amount": 0` and `"unit": "USD"`.
- Hotel, airline, rental car, and lounge perks should usually use
  `"category": "Travel"`.
- Status earning bonuses can be modeled as multipliers with `"unit": "%"`.
- Annual certificates, credits, or visit allowances should use the existing
  annual cadence values.

Do not add these fields:

```text
tier
tierRank
programId
membershipCategory
eventType
per_event
```

## 4. Use AI Only For Drafting

Use `.agents/prompts/membership-product-seeding.md` when asking AI to draft
membership product JSON.

AI output is a candidate only. Before writing JSON or uploading anything:

1. Validate every enum value against `src/features/admin/types/cardProduct.ts`.
2. If AI needs a missing enum value, stop and propose enum expansion.
3. Do not persist invented values such as `"Hyatt Diamond"` or
   `"Hotel Membership"` unless the enum has been deliberately expanded first.
4. Admin review remains the gate before upload.

## 5. Add Product Art

Place the product art image at:

```text
card-assets/images/cards/{provider}-{program}-{status}.png
```

The catalog JSON should reference the hosted card image path:

```json
"cardArtUrl": "/images/cards/hyatt-world-of-hyatt-globalist.png"
```

Follow `card-assets/card-art-ingestion.md` for sourcing and validation.

## 6. Register In Membership List

Add each new membership JSON filename to:

```text
src/data/membership-products/membership-list.json
```

Update the count in that file the same way card products do. Do not add
standalone membership products to `src/data/card-products/card-list.json`.

## 7. Upload Through The Existing Admin Path

Use the same upload path as card products:

1. Run the dev server: `npm run dev`
2. Navigate to the Admin portal -> Cards section
3. Use the create/upload product flow, or use `saveCardProduct()` from
   `src/data/card-products/loader.ts` programmatically

For staged rollout of a real batch, follow
`.agents/workflows/card-product-staging-rollout.md` after the JSON and image
assets are ready.

## 8. Verify

Minimum verification:

```bash
npm run test -- src/features/admin/schema/__tests__/cardProduct.schema.test.ts
```

Then verify the product uploaded to Firestore as a catalog card with:

- `cardKind: "membership"`
- `network: "Membership"`
- `isCustom: false`
- `createdByUserId: null`

## Out Of Scope

This workflow only creates shared catalog membership products.

Do not mix these into the same change unless explicitly requested:

- user-facing AddCardPage or BatchAddCards membership UX
- tracker UX for `"Always"` benefits
- Smart rating with status
- migration of existing credit-card products from `"Miles"` to specific
  `rewardProgram` values

## Reference Files

| Purpose | Path |
|---------|------|
| Membership authoring plan | `docs/deprecated/superpowers/plans/2026-05-09-membership-product-authoring.md` |
| Membership seeding prompt | `.agents/prompts/membership-product-seeding.md` |
| Card product schema docs | `src/data/card-products/SCHEMA.md` |
| Membership product schema docs | `src/data/membership-products/SCHEMA.md` |
| Admin enum source | `src/features/admin/types/cardProduct.ts` |
| Admin product schema | `src/features/admin/schema/cardProduct.ts` |
| Firestore loader | `src/data/card-products/loader.ts` |
| Membership JSON catalog | `src/data/membership-products/memberships/*.json` |
| Membership list registry | `src/data/membership-products/membership-list.json` |
| Card art ingestion guide | `card-assets/card-art-ingestion.md` |
| Card product staging rollout | `.agents/workflows/card-product-staging-rollout.md` |
