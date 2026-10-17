---
name: native-staging-verification
description: Verify Perkmon native staging builds on a local iOS Simulator or Android Emulator, including build and install, authorized E2E login and session restore, route and deep-link behavior, native diagnostics, platform smoke tests, safe evidence handling, and classification of product versus harness failures. Use after native-side changes, before native release readiness, or when asked for simulator or emulator staging smoke without deploying.
---

# Native Staging Verification

Canonical workflow doc: `.agents/workflows/native-staging-verification.md`

Use this skill to verify the native Capacitor shell against staging on iOS, Android, or both. Keep the run focused on native shell behavior; web product journeys remain owned by the web test suites.

This skill does not deploy staging or production. If the requested staging build is unavailable, report the mismatch instead of deploying it.

## Safety

- Target staging only. Never reuse this workflow against production.
- Require explicit user authorization before submitting E2E credentials to remote staging. Without authorization, stop before credential entry and report the remaining checks.
- Load credentials from `.env.staging`, `.env.staging.local`, or the existing shell environment without printing their values.
- Never automate Apple, Google, bank, hotel, payment-provider, or other real third-party login.
- Do not request push permission or test real APNs/FCM delivery unless the user separately authorizes that action.
- Treat Maestro debug output as sensitive because `-e` values can be stored in JSON and logs.
- Delete only exact generated artifacts known to contain credentials. Preserve unrelated files and concurrent worktree changes.
- Keep device simulators local. Do not move this lane into GitHub Actions.

## Execution

1. Load `.agents/workflows/native-staging-verification.md`.
2. Record the checkout root, branch, HEAD, dirty state, requested platforms, and expected staging target.
3. Resolve and record one exact device identifier per platform. Pass `--device` to every Maestro invocation.
4. Build and install the staging native shell without deploying.
5. Preflight login selectors before entering credentials.
6. Run login, authenticated relaunch, route navigation, deep-link, diagnostics, and platform-native smoke as separate evidence stages.
7. Classify every failure as `PRODUCT`, `HARNESS`, or `ENVIRONMENT`; corroborate product failures with independent evidence.
8. Remove credential-bearing artifacts, verify the cleanup, clear the app session, and retain only credential-free evidence.
9. Recheck HEAD and worktree status before reporting.

## Evidence Rules

- Do not trust one selector, screenshot, accessibility node, or retry as conclusive evidence.
- On iOS, account for accessibility text splitting and focus races. Prefer the keyboard accessory focus controls over `Tab` or an implicit submit.
- Do not trust `scrollUntilVisible` alone. Confirm the actual viewport with controlled swipes and screenshots.
- Start a deep-link check from a different route and assert the landing state before hiding the route dock.
- Re-evaluate historical Android symptoms against the current build. A foreground deep link returning to Dashboard may be a product failure; an origin assertion that disagrees with current Capacitor configuration may be harness drift. Do not assume either result without reproduction.
- A later harness failure does not erase an independently reproduced product regression.

## Output

Report in Chinese with:

- target HEAD, staging mode, selected platforms, and exact devices
- build and install result
- per-platform login, session restore, route, deep-link, diagnostics, and native-test evidence
- credential-artifact cleanup and app-state cleanup
- separate `PRODUCT`, `HARNESS`, and `ENVIRONMENT` findings
- each check marked `PASS`, `FAIL`, or `NOT_RUN`
- final gate marked `PASS`, `HOLD`, or `BLOCKED`
