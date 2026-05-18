# Membership Product Seeding Prompt

You are drafting Perkmon catalog membership products. Output candidate JSON only; do not write to Firestore and do not invent fields.

## Contract

Use the existing card product JSON contract:

- `name`: full product/status name, for example `"World of Hyatt Globalist"`
- `issuer`: provider brand from the approved enum, for example `"Hyatt"`
- `network`: `"Membership"`
- `annualFee`: `0` unless the membership itself has a known paid annual fee
- `cardArtUrl`: `/images/cards/<provider>-<program>-<status>.png`
- `rewardProgram`: loyalty program from the approved enum, for example `"World of Hyatt"`
- `baseValuation`: cents per point when meaningful; otherwise `1`
- `cardKind`: `"membership"`
- `multipliers`: existing multiplier objects only
- `benefits`: existing benefit objects only

Do not add `tier`, `tierRank`, `membershipCategory`, `eventType`, `per_event`, `programId`, or any new schema field.

## Enum Rules

Use only values from:

- `CARD_PRODUCT_ISSUERS`
- `CARD_PRODUCT_NETWORKS`
- `CARD_PRODUCT_REWARD_PROGRAMS`
- `ALL_RESET_FREQUENCIES`
- benefit categories/types from the existing admin product schema

If a needed enum value is missing, return:

```json
{
  "needsEnumExpansion": true,
  "missingValues": {
    "issuer": [],
    "network": [],
    "rewardProgram": [],
    "benefitCategory": [],
    "benefitType": [],
    "resetFrequency": []
  },
  "reason": "Explain why the value is needed."
}
```

## Modeling Rules

- Model each status as one product. Example: `World of Hyatt Discoverist`, `World of Hyatt Explorist`, and `World of Hyatt Globalist` are separate products.
- `issuer` is the provider brand. Example: `"Hyatt"`, not `"World of Hyatt"`.
- `rewardProgram` is the loyalty/status program. Example: `"World of Hyatt"`.
- Persistent perks use `"resetFrequency": "Always"`.
- Annual credits, certificates, or visit allowances use existing annual cadence values.
- Use `amount: 0` and `unit: "USD"` for non-monetary perks.
- Use `category: "Travel"` for hotel, airline, rental car, and lounge benefits unless a more precise existing enum is already available.
- Do not create event-tracking fields. A stay, flight, rental, or visit log is a future UX layer, not a product schema field.

## Output

Return:

```json
{
  "products": [
    {
      "name": "",
      "issuer": "",
      "network": "Membership",
      "annualFee": 0,
      "cardArtUrl": "",
      "rewardProgram": "",
      "baseValuation": 1,
      "cardKind": "membership",
      "multipliers": [],
      "benefits": []
    }
  ],
  "reviewNotes": [
    "List assumptions, source-sensitive claims, and benefits that need admin review."
  ]
}
```
