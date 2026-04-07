---
description: Avoid undefined values when writing to Firestore
---

# Firestore: No `undefined` Values

Firestore **rejects** `undefined` field values at any depth. This applies to `addDoc`, `updateDoc`, `setDoc`, and `WriteBatch` operations.

## Rule

**Never pass `undefined` to Firestore.** Always sanitize data before writing.

## How

Use the `cleanObject()` helper in `src/services/taskService.ts` (or copy the pattern into other services):

```typescript
function cleanObject<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [
        k,
        v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
          ? cleanObject(v as Record<string, unknown>)
          : v,
      ])
  ) as T;
}
```

## Where It's Applied

- `taskService.createTask()` — cleans task data before `addDoc`
- `taskService.updateTask()` — cleans updates before `updateDoc`
- `taskService.completeRecurringTask()` — cleans recurrence rule and next task data before batch write

## Common Pitfalls

1. **Optional interface fields** — e.g. `RecurrenceRule.endDate?` spreads as `undefined` if not set
2. **Clearing a field** — use `deleteField()` from `firebase/firestore`, not `undefined`
3. **FieldValue sentinels** — `serverTimestamp()`, `deleteField()`, `increment()` etc. are special objects. When recursing to strip `undefined`, use `Object.getPrototypeOf(v) === Object.prototype` to only recurse into plain objects, otherwise you corrupt these sentinels
4. **Pending serverTimestamp** — use `doc.data({ serverTimestamps: 'estimate' })` in `onSnapshot` listeners so pending timestamps get a client-side estimate instead of `null`
