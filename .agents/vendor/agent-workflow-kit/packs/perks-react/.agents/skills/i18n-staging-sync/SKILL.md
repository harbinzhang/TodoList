---
name: i18n-staging-sync
description: Use when staging or ship is blocked by missing, stale, or structurally invalid i18n catalogs before deploy.
---

# i18n Staging Sync Skill

Canonical workflow doc: `.agents/workflows/i18n-staging-sync.md`

Use this skill when a pre-staging i18n gate fails, a feature adds or changes English source copy, or a release candidate needs locale catalogs synchronized before staging deploy.

Do not use this skill for broad naturalness sweeps. It is a release-readiness workflow for confirmed structural gaps, changed critical copy, and smoke-driven blockers.

## Safety

- Work in a clean isolated branch or the active `release-branch` ship scope only.
- Commit only locale JSON, review ledgers, i18n reports, and necessary i18n tooling/doc changes.
- Do not mark machine-filled copy as reviewed unless it was manually or agent reviewed for the target locale.
- Preserve placeholders, `<Trans>` tags, plural category shape, brand/protected terms, amounts, dates, and i18next interpolation.
- Treat deploy workflows as read-only for i18n: do not modify catalogs during `deploy:staging`.

## Execution

1. Load `.agents/workflows/i18n-staging-sync.md`.
2. Run `npm run i18n:staging-gate -- --base origin/main`.
3. Use `test-results/i18n-staging-sync-report.json` as the source of truth.
4. Fix only blockers from the report.
5. Mark changed P0/P1 reviewed keys with reviewer `codex-staging-i18n-sync`.
6. Rerun the gate and any required smoke/build commands from the workflow.

## Outputs

- i18n staging sync report path and blocker summary
- Locale/catalog fixes applied
- Review-ledger keys marked and reviewer/date used
- Gate and smoke results
- Remaining advisory items
