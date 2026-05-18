---
name: prod-deploy
description: Prepare a production deploy readiness report by checking the current live production version/build marker, resolving the production release tag or baseline ref, listing user-visible features and risky changes since that baseline, and classifying each item into automatic verification versus manual verification. Use when the user asks for /prod-deploy, production deploy preparation, release verification planning, checking what changed since current prod, or deciding what must be manually tested before deploying to production.
---

# Prod Deploy

Canonical workflow doc: `.agents/workflows/prod-deploy.md`

Use this skill to prepare the verification plan before a production deploy. This skill is for readiness analysis and verification planning; actual production deploy commands are owned by `/deploy`.

## Safety

- Do not run production deploy commands from this skill.
- Read production Hosting markers and Git history first; do not infer the live version from local `package.json` or tags alone.
- If the user asks to deploy after the report, load `/deploy` and require explicit production target acknowledgement before any production deploy command.
- Keep existing unrelated dirty worktree changes untouched. Mention deploy-relevant runtime/config changes separately from docs, tests, scratch files, or local artifacts.
- Do not treat HTTP 200 as production version proof. Use `/sw-build-meta.js` from all production web entrypoints.

## Execution

1. Load `.agents/workflows/prod-deploy.md`.
2. Identify the target ref to evaluate. Default to `HEAD` in the active worktree unless the user names another branch, tag, commit, or PR head.
3. Check current production Hosting build metadata from:
   - `https://perks-react.web.app/sw-build-meta.js`
   - `https://perks-react.firebaseapp.com/sw-build-meta.js`
   - `https://perkmon.app/sw-build-meta.js`
4. Resolve the production baseline:
   - Prefer the live `releaseTag` from build metadata.
   - If absent, derive `v<appVersion>` and warn that hotfix tags can be ambiguous.
   - Confirm the resolved tag/ref exists locally after fetching tags if needed.
5. Compare `PROD_REF..TARGET_REF` and prepare a feature/risk list using commit subjects, changed paths, tests, deploy config, Functions entrypoints, Firestore rules/indexes, and user-facing surfaces.
6. For each item, classify:
   - `Auto verify`: deterministic commands or hosted checks can prove the behavior enough for deploy readiness.
   - `Manual verify`: a human must inspect UI, device behavior, external provider state, emails, push delivery, payments, visual copy, or real production/staging account behavior.
   - `Both`: automated checks cover regressions but manual smoke is still needed for product confidence.
7. Recommend a minimal command set for automatic verification. Include exact commands, target environment, and what each command proves.
8. Produce the final report in Chinese with:
   - current production version/build/tag evidence
   - target ref and comparison range
   - feature/change table
   - automatic verification checklist
   - manual verification checklist
   - blockers or unknowns before `/deploy`

## Output Shape

Use a compact Chinese report:

- `当前 Prod`: live `appVersion`, `buildId`, `releaseTag`, endpoint consistency.
- `对比范围`: `PROD_REF..TARGET_REF`, plus ancestry or tag warnings.
- `变更清单`: one row per user-visible feature/risky change, with evidence and verification mode.
- `自动验证`: commands to run and expected evidence.
- `人工验证`: exact user/admin/provider flows to click or inspect.
- `上线前结论`: `ready`, `ready after listed checks`, or `blocked`, with reasons.

Do not bury manual checks inside prose. Make them actionable checklist items.
