---
name: firestore
description: Inspect or modify Firestore data using the shared Firestore workflow and project conventions
---

# Firestore Skill

Canonical workflow doc: `.agents/workflows/run-firestore-script.md`

Shared conventions: `.agents/conventions.md`

Use this skill when the user asks to inspect Firestore data, run one-off Firestore scripts, debug production data issues, or apply targeted Firestore fixes.

## Safety

- Production Firestore reads or writes require explicit user approval before execution.
- Default to dry-run or read-only analysis first.
- Any write path must be explicit and should use a `--fix` style opt-in.
- Follow Firestore data safety rules from `.agents/conventions.md`, especially never writing `undefined`.

## Quick Query (inline, no script needed)

For simple one-off reads, use `npx ts-node` with an inline expression from `functions/`:

```bash
cd functions && npx ts-node --project tsconfig.json -e "
import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'perks-react' });
const db = admin.firestore();

async function main() {
  // Query by field
  const snap = await db.collection('cards').where('displayName', '==', 'AmEx Platinum').get();
  // Or get all
  // const snap = await db.collection('cards').get();

  for (const doc of snap.docs) {
    const data = doc.data();
    console.log('ID:', doc.id);
    console.log('displayName:', data.displayName);
    console.log('cardArtUrl:', data.cardArtUrl);
  }
}
main().then(() => process.exit(0));
"
```

This is useful for verifying a single document or spot-checking a field before/after a fix.

## Script-based Execution

For anything beyond a simple read, create a script:

1. Load `.agents/workflows/run-firestore-script.md`.
2. Identify whether the task is:
   - read-only investigation
   - dry-run analysis
   - targeted data repair
3. If a new script is needed, place it in `exp/functions-scripts/`.
4. Use `ignoreUndefinedProperties: true` and batch writes safely.
5. Run the script from `functions/` in dry-run mode first.
6. Only run the write mode after explicit approval and after confirming the dry-run result.
7. Report:
   - script path used or created
   - collections touched
   - whether execution was read-only, dry-run, or fix mode
   - any follow-up cleanup or verification needed

## Auth

Scripts use Application Default Credentials (ADC). If not authenticated:

```bash
gcloud auth application-default login
```

The user must run this interactively (suggest `! gcloud auth application-default login`).

## Outputs

- Firestore analysis summary
- Script path and execution mode
- Collections queried or modified
- Recommended next step or verification
