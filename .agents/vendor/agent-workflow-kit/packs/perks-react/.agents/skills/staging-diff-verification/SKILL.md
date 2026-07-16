---
name: staging-diff-verification
description: Use when a deployed staging build needs diff-focused validation, especially for changed user-write flows such as card art uploads, custom cards or perks, tracker used/undo, settings saves, or targeted evidence after deploy QA.
---

# Staging Diff Verification

Canonical workflow doc: `.agents/workflows/staging-diff-verification.md`

Use this skill when a diff needs real staging verification through manual comparison, targeted browser UI checks, and staging Firestore evidence. It is the bridge between `/prod-deploy` planning and `/deploy` readiness: classify the changed surfaces, reuse deploy QA for broad gates, then directly exercise only the staging behavior that prior QA cannot prove.

For the default fast post-deploy health gate, use `staging-qa`. For tracker-specific derivation checks, delegate to `staging-tracker-verification`. For broad generic journeys without diff classification, use `staging-user-journey-verification`.

This skill is not a staging QA rerun lane. If `deploy:staging`, `staging:qa`, `staging:qa:deep`, or equivalent CI has already run for the same hosted build marker, treat that result as existing evidence and do not rerun broad E2E, all-callable, rules, functions, or extension suites unless the user explicitly asks for a rerun or the prior evidence is missing.

## Safety

- Staging only. Do not target production.
- Treat hosted staging writes as allowed only when they are necessary to verify behavior and can be cleaned up.
- When the changed surface is a staging-safe user-write flow, do not stop at route smoke, unit tests, or a generic marker doc if the hosted build contains the target behavior. Run one real UI write/readback/cleanup flow unless a stop condition applies.
- Use the staging E2E account by default. If admin access is needed, use the configured staging admin account only after confirming it is available.
- Source both `.env.staging` and `.env.staging.local` before staging E2E or credential-dependent browser work.
- Mark temporary records with `codex-staging-diff-<suffix>` when creating data directly.
- Clean up temporary staging records before finishing. If cleanup fails, report exact collection/document IDs.
- Do not automate real third-party bank, hotel, Google, Apple, or payment-provider login flows unless the repo already has a mock/replay lane for that surface.
- Valid stop conditions for skipping a safe write are: staging is not on the target build, credentials or required role are missing, the flow would send real email/payment/provider traffic, the write cannot be safely restored, or the user explicitly limits the run to read-only checks.

## Execution

1. Load `.agents/workflows/staging-diff-verification.md`.
2. Identify the target diff:
   - default: the active worktree diff against the named baseline from the user, or `origin/main...HEAD` when preparing a staging release
   - after `/prod-deploy`: reuse the reported `PROD_REF..TARGET_REF` only for classification; validate against hosted staging
   - when hosted staging exposes a `releaseTag`, use that tag as the deployed target and keep local-only dirty docs out of the staging result
3. Confirm staging is reachable and record `/sw-build-meta.js`.
4. Build a verification matrix from changed paths:
   - prior deploy QA evidence to reuse
   - narrowly scoped commands only for gaps not already covered
   - UI flows to log into staging and click
   - Firestore reads/writes needed for proof
   - staging-safe product write flows that require real UI write/readback/cleanup
   - features that should be covered by unit, contract, E2E, or replay tests
   - explicit skips and manual-only external-provider checks
5. Do not run broad staging QA commands by default. Run only the smallest targeted command set that fills a real coverage gap. Keep online API probes bounded and targeted to touched callables.
6. Log into staging and perform targeted browser UI checks for changed pages/components. For staging-safe writes, perform the actual user action.
7. Use staging Firestore or Storage to inspect persisted state. For staging-safe writes, verify the product collection/object that the feature owns, not only an unrelated marker document.
8. Clean up temporary writes and verify cleanup.
9. Report in Chinese with commands, browser flows, Firestore evidence, cleanup, test coverage recommendations, blockers, and residual manual checks.

## Output Shape

Use a compact Chinese report:

- `目标和环境`: target ref/range, staging URL, staging build marker, account role used.
- `Diff 覆盖矩阵`: changed surface, evidence source, command/browser/Firestore verification, result.
- `自动验证`: commands run and pass/fail evidence.
- `浏览器验证`: exact staging paths clicked, actions performed, observed result.
- `Firestore 验证`: collections read/written, temporary IDs, cleanup result.
- `测试覆盖建议`: features that can or should be covered by tests, recommended test layer, and why.
- `未覆盖/需人工`: external provider, native device, visual judgment, or missing credential gaps.
- `结论`: `PASS`, `PASS_WITH_RISK`, or `BLOCKED`.
