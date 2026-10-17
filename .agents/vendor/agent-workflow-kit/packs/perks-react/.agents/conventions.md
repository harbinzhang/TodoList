# Project Conventions

This document captures important patterns, constraints, and conventions for the perks-react project.

---

## Change Scope

- Keep code changes narrowly scoped to the user request.
- Treat planning or review prompts such as `WDYT?`, `review`, `确认一下`, `plan`, `before doing`, or `可以推进` as discussion-only. Do not edit files or run implementation/test commands from those prompts alone.
- Only execute changes or tests after an explicit execution instruction such as `implement it`, `go ahead and change code`, `开始改`, `按这个做`, `make the changes`, or `run tests`.
- Do not add opportunistic refactors, abstractions, behavior changes, or environment-specific logic unless the task requires them.
- Fix presentation/reporting issues at the presentation/reporting layer; do not change lower-level semantics such as logging severity to make reports look cleaner.
- Before committing, verify staged files contain only task-related changes.

---

## Bundle Budget Checks

- Run `npm run bundle:check` for changes that can materially affect the web bundle or PWA precache: dependency changes, large feature/page additions, route/lazy-loading changes, Vite/Rollup/PWA/service-worker config, Firebase import patterns, admin surface changes, or shared UI/library changes used by many routes.
- Use `npm run bundle:audit` when a fresh `dist/` already exists and only the budget report is needed.
- Use `npm run build:analyze` after a `WARN` or `FAIL` to attribute growth before proposing chunking or dependency changes.
- Treat `WARN` as a review signal and `FAIL` as a stop: do not merge a bundle-budget failure without either fixing the growth or intentionally revising the budget.

---

## Firestore

### Never Use `undefined` Values

Firestore rejects `undefined` values when writing documents. This will throw:
```
FirebaseError: Function addDoc() called with invalid data. Unsupported field value: undefined
```

**Solutions:**

1. **Use `null` for optional fields:**
   ```typescript
   // ❌ Bad
   { expiration: value || undefined }

   // ✅ Good
   { expiration: value || null }
   ```

2. **Conditionally include fields (preferred for truly optional fields):**
   ```typescript
   // ✅ Good - only include if value exists
   {
     requiredField: 'value',
     ...(optionalValue ? { optionalField: optionalValue } : {}),
   }
   ```

3. **Filter out undefined before writing:**
   ```typescript
   const cleanData = Object.fromEntries(
     Object.entries(data).filter(([_, v]) => v !== undefined)
   );
   ```

### Timestamp Immutability

- `createdAt` is an immutable field — it must only be set during document creation, never on updates.
- Use `createDoc()` or `createDocWithId()` for new documents (auto-injects both `createdAt` and `updatedAt`).
- Use `updateDocById()` for updates (auto-injects only `updatedAt`).
- Never pass `createdAt` in update payloads.

---

## React Patterns

### Toast Notifications
Never use `alert()`. Use the `useToast` hook for user feedback:
```typescript
import { useToast } from '@/shared/hooks/useToast';
const { showSuccess, showError, showWarning, showInfo } = useToast();
showSuccess('Operation completed!');
showError('Something went wrong');
```

### Confirmation Dialogs
Never use `confirm()`. Always use `ConfirmationModal`:
```typescript
import { ConfirmationModal } from '@/shared/components/ConfirmationModal';
```

### Mobile-safe rows (no-crush)
Never place variable-length text (a `t(...)` call or `{expr}`) with `whitespace-nowrap` + `flex-shrink-0`/`shrink-0` beside flexible content in one flex row — at ~390px WebView widths the badge refuses to shrink and crushes the title. Use a blessed pattern instead:
```typescript
import { SafeChipGroup, EllipsisText } from '@/shared/components/SafeLayoutPrimitives';
// wrap badges in SafeChipGroup (flex-wrap + per-child ellipsis), or give the title truncate + min-w-0,
// or use `hidden sm:inline` to drop the label on mobile, or an overflow-x-auto scroller.
```
Split long compound copy (e.g. `Upcoming · Available {{date}}`) onto its own line at narrow widths. `npm run layout:scan` flags new offenders; the `@layout-guard` e2e lane detects rendered crush.

---

## Spacing & Density

Spacing is semantic, not ad-hoc. Prefer the tokens below over sprinkling `p-4`/`p-5`/`p-6` and raw `gap-*` per surface. Do **not** mechanically replace every spacing class — local spacing may stay where it expresses a genuine component-specific need.

### Card padding utilities
`.card` intentionally carries **no padding**; pair it with one of these (defined in `src/index.css`):
```
.card-pad          → p-4 sm:p-5        // comfortable: regular cards, settings, forms
.card-pad-emphasis → p-4 sm:p-5 lg:p-6 // emphasized: metric/stat cards (Dashboard metric cards = reference impl)
.card-pad-hero     → p-6 sm:p-8        // spacious: Hero, empty states, rare emphasis
```

### Semantic gap tokens
`SafeRow` / `SafeStack` / `SafeChipGroup` / `SafeButtonGroup` (`src/shared/components/SafeLayoutPrimitives.tsx`) accept semantic `gap` tokens; any raw Tailwind gap string still passes through unchanged:
```
gap="chip"    → gap-1.5   // chips, badges, tags
gap="icon"    → gap-2     // icon + label
gap="row"     → gap-3     // items within a row
gap="loose"   → gap-4     // loose row groups
gap="section" → gap-6     // between sections
```

### Page-level rhythm: `PageStack` / `SectionStack`
A page's top-level block rhythm is declared once via `<PageStack density>` (same file, `src/shared/components/SafeLayoutPrimitives.tsx`):
```
density="compact"     → space-y-4               // data-dense pages (Benefits Tracker)
density="comfortable" → space-y-6 md:space-y-8  // default — Dashboard, Card Summary, Card Detail
density="spacious"    → space-y-8 md:space-y-10 // form flows, search/browse pages (Add Card)
```
Pages must **not** self-manage container/max-width/vertical page padding — the app shell owns those (`container-custom py-6 md:py-8`); routes needing their own surface register in `FOCUSED_SURFACE_ROUTES` instead. `SectionStack` covers section-internal stacking (fixed `space-y-4`). Only page-block spacing scales with breakpoint; inner spacing stays constant so text wrapping never shifts the rhythm skeleton.

### Structural vs optical
Structural spacing **must** use the tokens/utilities above. Optical adjustments (e.g. Mint's `gap-3.5`, `space-y-[18px]`) are allowed **only** inside theme-primitive components (e.g. `MintEditorialPrimitives`) and must carry a brief `/* optical: <reason> */` comment.

### Migration order (each batch ships independently)
1. Primitives + Dashboard reference — **done**
2. Benefits Tracker compact density (respect 44px touch targets) — **done**
3. Card Summary / Card Detail rhythm — **done**
4. Empty / emphasis surfaces → `.card-pad-hero`
5. Remaining bare `.card` + `p-*` → `.card-pad*`, migrated by domain

---

## Type Safety

### Casting for Firestore Subgroups
When dealing with category subgroups that may be null, use type casting:
```typescript
categorySubgroup: (value || null) as any,
```

---

## Production Safety

Never read, modify, or deploy to production without explicit user approval first. Always confirm before any prod action. Production deploys must go through `/deploy` and require explicit user acknowledgement of the production target before any production deploy command runs.

---

## Additional Notes

- **Debug logging**: When troubleshooting, add `console.log` statements before async operations to trace execution flow
- Remove debug logging before committing to production
