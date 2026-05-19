---
description: How to add a new credit card to the system
---

# Add a New Credit Card

This workflow covers creating a new card product JSON file and uploading it to Firestore via the admin UI.

## 1. Create the Card JSON File

Create a new file in `src/data/card-products/cards/` following the naming convention: `{issuer}-{product-name}.json`.

Use an existing card as reference (e.g., `amex-gold.json`). The file must conform to the `CardProduct` interface from `src/shared/types/card-product.ts`:

```json
{
  "name": "Full Card Name",
  "issuer": "Amex | Chase | Citi | Capital One | Discover | Wells Fargo | Bank of America | Barclays | US Bank | Other",
  "network": "Visa | Mastercard | Amex | Discover",
  "annualFee": 0,
  "cardArtUrl": "/images/cards/{issuer}-{product}.png",
  "rewardProgram": "MR | UR | TYP | Cash Back | Miles | Other",
  "baseValuation": 1,
  "multipliers": [
    {
      "category": "Dining | Travel | Shopping | ...",
      "subcategory": "(optional) Flights | Hotels | ...",
      "value": 4,
      "cap": 25000,
      "capUnit": "(optional) $ | pts",
      "title": "(optional) Short title for the multiplier",
      "note": "Human-readable earning description"
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
      "merchantTag": "optional-merchant-tag"
    }
  ]
}
```

## 2. Add Card Art Image

Place the card art image at `card-assets/images/cards/{issuer}-{product}.png`.

- Use a transparent PNG if possible
- Minimum accepted width: `600px`
- Prefer an original source width of `1200px+` before resizing
- If no better source exists, a confirmed pure card face `>= 200px` wide may be used as an `upscaled fallback`
- Follow the canonical sourcing and validation guide at `card-assets/card-art-ingestion.md`

## 3. Register in Card List

Add the new card's filename to `src/data/card-products/card-list.json` and update the count.

## 4. Upload via Admin UI

// turbo
1. Run the dev server: `npm run dev`
2. Navigate to the Admin portal → Cards section
3. Use the "Create Card Type" form (`CardProductEditor` / `CreateCardType` components) to upload, or use `saveCardProduct()` from `src/data/card-products/loader.ts` programmatically.

For staged rollout of a real batch, follow `.agents/workflows/card-product-staging-rollout.md` after the JSON and image assets are ready.

## 5. Verify (Manual)

The user will verify the card manually. Do NOT use the browser tool to verify.

## Reference Files

| Purpose | Path |
|---------|------|
| Card product type | `src/shared/types/card-product.ts` |
| Card product schema | `src/shared/schema/card-product.ts` |
| Firestore loader | `src/data/card-products/loader.ts` |
| Card JSON catalog | `src/data/card-products/cards/*.json` |
| Card list registry | `src/data/card-products/card-list.json` |
| Card art ingestion guide | `card-assets/card-art-ingestion.md` |
| Card product staging rollout | `.agents/workflows/card-product-staging-rollout.md` |
| Admin card editor | `src/features/admin/components/CardProductEditor.tsx` |
| User add-card page | `src/features/cards/pages/AddCardPage.tsx` |
| Data ingestion guide | `src/data/card-products/cards/data_ingestion_guide.md` |
