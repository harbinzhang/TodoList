# Frontend Logging Policy Improvement Plan

## Summary
- Adopt a split policy:
  - `log/info/debug/success`: production hidden by default, enabled only with `VITE_CLIENT_DEBUG_LOGS=true`.
  - `warn/error`: production surfaced via **sanitized console.warn/error plus telemetry**.
- Target frontend app code under `src/`; leave Cloud Functions, scripts, tests, and docs out of scope.

## Preflight
- Branch `dev6-rebase-0d6c5133` does **not** contain commit `d4064913` ("fix: gate auth sign-out debug logs"). Result: `src/features/auth/api/authApi.ts:41` still has an ungated `console.info('[AuthSignOut]', details)` and `authApi.test.ts` lacks the matching assertion update.
- Decision: the new `clientLogger` refactor **supersedes** `d4064913`; do not cherry-pick. Explicitly note this in the commit message so the supersession is auditable.

## Key Changes
- Add `src/shared/lib/clientLogger.ts` with `debug/info/warn/error`.
  - `debug/info` print only in dev (`import.meta.env.DEV`) or when `VITE_CLIENT_DEBUG_LOGS=true`.
  - `warn/error` print in production, but only through sanitized structured payloads.
  - Redaction helper: redact keys matching token, credential, email, uid, referralCode, accessToken, idToken, nonce.
  - `VITE_CLIENT_DEBUG_LOGS` is the **only** debug flag; no auth-specific alias.
- Replace direct `console.log/info` calls with `clientLogger.debug/info`:
  - `src/api/errorReporter.ts:1212` — App version log.
  - `src/env.ts:253` — `✅ ... safety checks passed` hosted-safety log.
  - `src/firebase/config.ts:72` — Analytics initialized.
  - `src/firebase/config.ts:99` — App Check initialized.
  - `src/firebase/config.ts:122-126` — emulator debug logs.
  - `src/features/auth/api/authBridge.ts` — Google/Apple progress logs (incl. `logAuthBridge` helper).
  - `src/features/auth/api/authApi.ts:41` — `[AuthSignOut]` info (supersedes d4064913).
  - `src/app/providers/AuthProvider.tsx:236` — `✅ User profile created/updated`.
  - `src/app/providers/AuthProvider.tsx:284` — Apple variant.
  - `src/features/referral/api/referralApi.ts:52, :89, :98` — stored-code / self-referral / callable-status logs.
- Convert direct `console.warn/error` calls to `clientLogger.warn/error`:
  - `src/features/referral/api/referralApi.ts:123` — attribution failure.
  - `src/app/Layout.tsx:79` — sign-out error.
  - For meaningful app failures, also call `reportError` or existing Crashlytics path.
  - Avoid duplicate reporting where `reportError` already runs.
  - Keep user-facing toast behavior unchanged.
- Update `errorReporter` console output so tracked/submitted warnings and errors are sanitized before printing; transport behavior (Firestore + Crashlytics) unchanged.

## Tests
- New `src/shared/lib/__tests__/clientLogger.test.ts`:
  - `debug/info` silent by default in production-like env.
  - `debug/info` emit when `VITE_CLIENT_DEBUG_LOGS=true`.
  - `warn/error` emit sanitized payloads in production.
  - Sensitive fields redacted.
- Update existing tests:
  - `authApi.test.ts` — sign-out remains quiet by default (replaces d4064913's test change).
  - `authBridge.test.ts` — no progress logs by default; warn/error still surfaces sanitized failures.
  - `referralApi.test.ts` — no raw referral-code console output assertions.
  - `errorReporter.behavior.test.ts` — sanitized console output, transport unchanged.
- Run:
  - `npx vitest run --reporter=verbose src/features/auth/api/__tests__/authApi.test.ts src/features/auth/api/__tests__/authBridge.test.ts src/features/referral/api/__tests__/referralApi.test.ts src/api/__tests__/errorReporter.behavior.test.ts src/shared/lib/__tests__/clientLogger.test.ts`
  - `npm run lint`
  - `npm run bundle:check`

## Assumptions
- Production `warn/error` console output is acceptable when sanitized and backed by telemetry.
- Raw user identifiers, referral codes, credentials, and tokens must never be printed.
- Browser/Firebase SDK warnings outside app control are out of scope.
