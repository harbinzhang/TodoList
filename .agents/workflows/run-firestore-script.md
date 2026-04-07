---
description: How to run one-off scripts against production Firestore data
---

# Running Scripts Against Production Firestore

## Setup

Scripts use `firebase-admin` (server SDK) which lives in `functions/node_modules`. They must be placed in `functions/src/scripts/` and run from the `functions/` directory.

## Script Template

Create `functions/src/scripts/<name>.ts`:

```typescript
import * as admin from "firebase-admin";

admin.initializeApp({ projectId: "todo-rea" });
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true }); // prevents errors on undefined fields

async function main() {
  const dryRun = !process.argv.includes("--fix");
  console.log(dryRun ? "🔍 DRY RUN" : "🔧 FIX MODE");

  // Query data
  const snap = await db.collection("tasks").get();

  // Process + batch write
  const batch = db.batch();
  for (const doc of snap.docs) {
    // ... analyze, batch.update(doc.ref, { ... })
  }

  if (!dryRun) await batch.commit();
}

main().then(() => process.exit(0)).catch(console.error);
```

## Firestore Collection Reference

All collections are **top-level** (no subcollections). Key collections:

| Collection | Queried by | Description |
|------------|-----------|-------------|
| `tasks` | `userId` | Task records with title, description, dueDate, priority, subtasks, sortOrder |
| `projects` | `userId` | User projects with name, color, sortOrder |
| `labels` | `userId` | User labels with name, color |
| `sections` | `projectId`, `userId` | Sections within projects, with name and sortOrder |
| `savedFilters` | `userId` | User-created saved filter configurations |

## Key Rules

1. **Always dry-run first** — default to report-only, require `--fix` flag to write
2. **`ignoreUndefinedProperties: true`** — Firestore rejects `undefined` values; this setting skips them
3. **Batch limit** — Firestore batches max 500 ops. Commit and reset if you exceed ~400
4. **Auth** — Uses Application Default Credentials. If not logged in: `gcloud auth application-default login`

## Running

```bash
# DRY RUN (read-only, safe)
// turbo
cd functions && npx ts-node --project tsconfig.json src/scripts/<name>.ts

# APPLY CHANGES (writes to Firestore)
cd functions && npx ts-node --project tsconfig.json src/scripts/<name>.ts --fix
```
