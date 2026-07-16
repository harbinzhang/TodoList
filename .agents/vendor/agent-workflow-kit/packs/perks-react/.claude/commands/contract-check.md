---
description: Run the full contract boundary check across all three runtimes (frontend, functions, shared packages). Required before merging any change that touches packages/contracts, packages/shared-runtime, src/shared/contracts/, or functions/src/types.ts.
---

Run `npm run contracts:check` from the project root.

This command:
1. Builds `packages/contracts` and `packages/shared-runtime`
2. Runs `scripts/check-contract-boundaries.mjs` (import path enforcement)
3. Builds the frontend (`build:local`) and functions (`build:functions`)
4. Runs `scripts/smoke-contract-package.mjs` and `scripts/smoke-shared-runtime-package.mjs`
5. Runs `scripts/audit-contract-metadata.cjs`

## If it FAILS — Diagnosis Guide

**"Illegal import of @perkmon/contracts"**
→ A file outside the approved gateways is importing from `@perkmon/contracts/*`
→ Frontend: route through `src/shared/contracts/` instead
→ Functions: route through `functions/src/types.ts` instead

**"Illegal direct import of @perkmon/shared-runtime in frontend"**
→ Frontend feature code must use wrappers in `src/shared/lib/*`
→ Check `src/shared/lib/` for the appropriate wrapper, or create one if missing

**Build error in functions**
→ Run `npm run functions:check-vendor-integrity` — vendored packages may be stale
→ If stale: `npm run functions:prepare` to re-vendor

**"Timestamp shape mismatch"**
→ Frontend contracts must use `Timestamp = Date`; functions must use `admin.firestore.Timestamp`
→ Never cross-import Timestamp bindings between the two runtimes

## Narrower checks (faster)
- Import boundaries only: `npm run shared:build && node scripts/check-contract-boundaries.mjs`
- Metadata audit only: `node scripts/audit-contract-metadata.cjs`
- Compatibility audit: `npm run contracts:audit`
