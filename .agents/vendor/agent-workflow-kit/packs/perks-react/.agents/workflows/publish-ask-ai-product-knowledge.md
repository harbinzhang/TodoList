---
description: Publish the Ask AI product-knowledge corpus to Firestore (no functions deploy)
---

# Publishing the Ask AI Product-Knowledge Corpus

The Ask AI assistant answers "how does this app work?" questions from a
product-knowledge corpus. This workflow publishes an updated corpus to Firestore
`config/askAiProductKnowledge` so Cloud Functions pick it up within ~60 minutes
**without a `deploy functions`**.

Canonical operational reference: `OPERATIONS.md` → "Ask AI Product-Knowledge Corpus".
This doc is the step procedure; the concepts (TTL, fail-safe, 1 MB limit) live there.

## When to use

- You changed the FAQ / product-help wording Ask AI uses.
- You need to correct or roll back the live corpus.

## Prerequisites

- The corpus source of truth is `functions/src/assistant/productKnowledge.ts`
  (`ENTRIES`). Edit it there, land it via PR, THEN publish — never edit the
  Firestore document by hand (the repo is the reviewable source of truth).
- Application Default Credentials for the target project
  (`gcloud auth application-default login` if needed). See
  `.agents/workflows/run-firestore-script.md`.

## Steps

1. **Edit the corpus** in `functions/src/assistant/productKnowledge.ts` (`ENTRIES`)
   → PR → review → merge.

2. **Dry-run** (read-only; validates and prints the entry count + version transition):
   ```bash
   npx tsx exp/functions-scripts/publish-product-knowledge.ts
   ```

3. **Publish to staging** (default target `perkly-staging-7dab8`):
   ```bash
   npx tsx exp/functions-scripts/publish-product-knowledge.ts --fix
   ```
   Verify in Ask AI after ≤60 min (or restart a staging instance to force a cold read).

4. **Publish to production** — requires an explicit project AND the confirmation flag:
   ```bash
   GCLOUD_PROJECT=perks-react npx tsx exp/functions-scripts/publish-product-knowledge.ts --fix --confirm-production
   ```
   Without `--confirm-production` a prod `--fix` refuses and exits non-zero before
   any Firestore connection.

## Notes

- The script defaults to **staging**; production needs both `GCLOUD_PROJECT=perks-react`
  and `--confirm-production`.
- A running Firestore emulator (`FIRESTORE_EMULATOR_HOST`) is targeted regardless
  of `projectId` and is exempt from the `--confirm-production` guard.
- Propagation is ≤60 min (in-memory TTL); no functions deploy is required.
- **Rollback = re-publish** the corrected `ENTRIES` as a new version. Deleting the
  Firestore document does NOT revert already-warm instances (they keep the
  last-good corpus until restart). See `OPERATIONS.md` for details.
- The corpus is a single Firestore document (1 MB cap); current size is tens of KB.
