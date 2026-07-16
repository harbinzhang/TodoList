---
description: Synchronize i18n catalogs before staging deploy by fixing gate blockers in an isolated branch or release scope
---

# i18n Staging Sync Workflow

Use this workflow when `npm run i18n:staging-gate` fails before staging deploy or during `$ship`.

## Scope

- Start from a clean release candidate, clean `origin/dev` branch, or active `release-branch` ship scope.
- Fix only i18n gate blockers: missing locale keys, placeholder/tag/plural drift, English leak/protected-term errors, or missing/stale review-ledger entries for changed P0/P1 English keys.
- Do not perform broad naturalness cleanup or advisory wording churn.
- Do not change product behavior, schemas, routes, or public APIs.

## Procedure

1. Confirm the worktree and branch:
   ```bash
   git rev-parse --show-toplevel
   git branch --show-current
   git status --short --branch
   ```
2. Run the read-only gate:
   ```bash
   npm run i18n:staging-gate -- --base origin/main
   ```
3. Read `test-results/i18n-staging-sync-report.json` and classify blockers:
   - Missing locale key: add the key to every blocked locale with a reviewed translation.
   - Placeholder/tag/plural drift: fix only the listed key and preserve required tokens.
   - English leak/protected term: correct the listed value without changing protected brand terms.
   - Review-ledger blocker: review the listed changed P0/P1 value and mark it.
4. Mark reviewed changed P0/P1 keys:
   ```bash
   node scripts/i18n-review-ledger.mjs mark --locale <locale> --date <YYYY-MM-DD> --reviewer codex-staging-i18n-sync <ns.key>
   ```
5. Rerun:
   ```bash
   npm run i18n:staging-gate -- --base origin/main
   npm run i18n:validate-catalogs
   npm run i18n:quality -- --locale zh,zh-TW,es,pt-BR,fr,de,it,ko,nl,hi,tr,ja,id,vi,fil,th,ru,ar,pl
   ```
6. If the report has `needsCriticalSmoke: true`, run:
   ```bash
   npm run test:e2e:i18n-critical
   ```
7. If the sync is part of `$ship`, commit and push the fixes before returning to the failed ship phase.

## Hard Stops

- Stop if the report points at unrelated product/layout/runtime failures.
- Stop if translations cannot be reviewed well enough to mark a changed P0/P1 key.
- Stop if required placeholders, tags, or plural categories are ambiguous.
- Stop if fixing blockers would require Firestore schema, API, routing, or behavior changes.

## Reporting

Report the branch, report path, blockers fixed, review-ledger entries marked, commands run, `needsCriticalSmoke`, and any remaining advisories.
