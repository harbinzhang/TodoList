# Project Conventions

This document captures important patterns, constraints, and conventions for the perks-react project.

---

## Change Scope

- Keep code changes narrowly scoped to the user request.
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
