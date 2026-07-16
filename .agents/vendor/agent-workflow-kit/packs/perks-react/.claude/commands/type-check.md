---
description: Run TypeScript type checking for both the frontend and Cloud Functions. Use after adding new types, changing shared contracts, or when you want a full compile-time verification pass without running tests.
---

Run both typechecks in sequence:

```bash
npm run typecheck
npm run typecheck:functions
```

## Frontend typecheck (`npm run typecheck` → `tsc -b`)
- The root `tsconfig.json` is a **solution file** (`"files": []`, only project references), so bare `npx tsc --noEmit` is a NO-OP that checks nothing and exits 0. Use `npm run typecheck` (`tsc -b`) — or `npx tsc --noEmit -p tsconfig.app.json` — to actually typecheck the app.
- Covers `src/` including all feature code, shared contracts, and env types (via `tsconfig.app.json` referenced by the build)
- Does NOT cover `functions/` (its own tsconfig); `packages/` are rebuilt first by the `shared:build` step in `npm run typecheck`

## Functions typecheck (`npm run typecheck:functions`)
- Runs `npm run functions:prepare` (rebuild + re-vendor `@perkmon/*` into `functions/node_modules`) **first**, then `tsc --noEmit` against `functions/tsconfig.json`
- Covers `functions/src/` including all Cloud Functions
- Re-vendoring first is deliberate: a bare `cd functions && npx tsc --noEmit` type-checks against whatever vendored copy is currently installed, so a stale local vendor reports false type errors on `@perkmon/*` symbols (e.g. a newly-added operational flag). Prefer `npm run typecheck:functions`.

## Common Errors and Fixes

**"Cannot find module '@perkmon/contracts/...'"**
→ Run `npm run shared:build` to rebuild the packages first

**"Property 'X' does not exist on type 'Y'"**
→ Likely a contract shape mismatch — check `src/shared/contracts/` and `docs/current-data-contracts.md`

**"Type 'Timestamp' is not assignable to type 'Date'"**
→ Using the wrong Timestamp binding — frontend uses `Date`, functions use `admin.firestore.Timestamp`

**"Object is possibly 'undefined'"**
→ Add a null check, or use `??` — don't use `!` assertion unless the value is genuinely always present

## Note on Admin bundle
The admin surface has its own Vite config. If you added types used only in the admin bundle, also check:
```bash
npx tsc --noEmit --project tsconfig.app.json
```
