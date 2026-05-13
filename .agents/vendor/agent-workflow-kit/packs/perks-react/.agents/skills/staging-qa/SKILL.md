---
name: staging-qa
description: Run the fast post-deploy staging QA gate across remote E2E smoke, Firebase Auth/Firestore health, Hosting build metadata, and stale staging test-data cleanup.
---

# Staging QA

Canonical workflow doc: `.agents/workflows/staging-qa.md`

Use this skill after a staging deploy, or when the user asks to validate staging broadly without running a full release or tracker deep-dive.

The default mode is environment-health validation. It reads the hosted build marker and warns when staging is on a different version than the current checkout. Use explicit expected build/version inputs only when you need strict deploy verification for a just-deployed build.

## Safety

- This skill is staging-only. Do not point it at production.
- Keep the default gate fast, low-write, and deterministic.
- Do not run paid AI, broad synthetic journeys, or fragile visual assertions as part of the default gate.
- Temporary cleanup is limited to staging E2E user records marked with `codex-staging-*` or `staging-qa-*`.
- Keep staging E2E credentials in `.env.staging.local` or the shell environment; never commit real credentials.

## Execution

1. Load `.agents/workflows/staging-qa.md`.
2. Run `npm run staging:qa` from the repo root.
3. Treat the default run as health-only unless the deploy workflow or the user provided an explicit expected build/version.
4. If the remote E2E lane fails, inspect the Playwright report before rerunning.
5. If the Firebase QA script fails, use its `/tmp/staging-qa-*.json` report to identify the failing staging invariant.
6. Escalate to `staging-tracker-verification` only when tracker, benefit cadence, userCard, or tracking-trigger behavior changed.

## Outputs

- Remote staging E2E pass/fail summary
- Firebase QA pass/warn/fail summary
- Whether build-marker validation ran in health-only or strict expected-build mode
- Stale staging records cleaned
- Any blockers or follow-up checks
