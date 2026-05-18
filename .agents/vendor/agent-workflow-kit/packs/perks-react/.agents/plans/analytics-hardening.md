# Plan: Finish Analytics Reliability, GA4 Hygiene, App Check, And HTTP URL Hardening

## Summary
Bring the current analytics setup from "basically wired" to "fully supportable and verifiable" without replacing existing admin metrics. GA4 remains client-funnel analytics; Firestore/admin metrics remain authoritative for operational aggregates. Preserve existing home banner dual tracking and treat iOS plist work as config verification, not a repo implementation task.

## Key Changes

### 1. Analytics reliability + taxonomy
- Add a web analytics readiness queue in the shared analytics facade (`src/api/analytics.ts`) so events fired before Firebase Analytics finishes async initialization (`isSupported().then(...)` in `src/firebase/config.ts`) are flushed instead of silently dropped.
- Fix auth analytics taxonomy:
  - keep `auth_sign_in_*` events for real sign-in
  - add `auth_sign_up_start`, `auth_sign_up_success`, `auth_sign_up_failure`
  - add `auth_email_verification_sent` and `auth_email_verified`
  - normalize Firebase error codes to stable snake_case codes (e.g. `auth/email-already-in-use` → `email_already_in_use`) — this is taxonomy stability, not PII redaction
- Keep existing `setAnalyticsUserId` logic as **verify-only**:
  - confirmed already wired in `AuthProvider.tsx:125,218,273,347`, including guest-upgrade ordering before `auth_link_result`
  - do not re-implement; only add tests / real-device verification

### 2. GA4 high-cardinality param cleanup
- Remove raw Firestore document IDs from GA4 event params: `card_id`, `user_card_id`, `tracking_id`, `benefit_id`.
- Use coarse dimensions instead: `source`, `card_kind`, `benefit_cadence`, `amount_set`, `auto_checked`, `target_type`.
- Keep detailed IDs only in Firestore/admin/server metrics, never in GA4 event params.
- Add missing high-value funnel coverage:
  - `card_add_start`, `card_add_failure`, `card_add_blocked`
  - `benefit_mark_used_failure`, `benefit_mark_unused_failure`
  - signup-specific failure (`auth_sign_up_failure` with normalized code)
  - leave existing `route_view`, `client_error`, and `home_banner_*` events intact

### 3. App Check hardening for home banner metrics

**Production transport reality (verified in current code):**
- Client emitter `src/features/dashboard/api/trackHomeBannerMetricApi.ts` calls only `trackHomeBannerMetricHttp` (the HTTP endpoint), on web and native, and short-circuits in emulator mode.
- Callable `trackHomeBannerMetric` is exported from `functions/src/index.ts:69` but has **no client caller** in this repo. Its App Check is defense-in-depth for any future or external caller, not the production hot path.
- `src/firebase/appCheckToken.ts:getAppCheckTokenOrNull()` already abstracts web (`firebase/app-check` `getToken(appCheck)`) and native (`@capacitor-firebase/app-check` `FirebaseAppCheck.getToken()`); the HTTP transport can use it directly on both platforms.
- Firebase JS `httpsCallable` only auto-attaches the JS `appCheck` token (web only). Native does not initialize JS App Check, so callable auto-attach **does not work on native**. Plan does not rely on it.

**Server changes:**
- Keep `invoker: "public"` on both functions; guests must be able to emit banner metrics.
- HTTP `trackHomeBannerMetricHttp`: mirror `trackGrowthRouteMetric.ts:70-80`:
  - require `X-Firebase-AppCheck` header
  - missing → `401 app_check_required`
  - `getAppCheck().verifyToken(token)` failure → `401 app_check_invalid`
  - keep existing IP rate-limit as secondary defense after App Check passes
- Callable `trackHomeBannerMetric`: add `enforceAppCheck: true` as defense-in-depth. The `httpsCallable` API only reads the JS App Check instance to auto-attach a token and **exposes no API to inject a token from another source**, so the callable is effectively **web-only** (JS App Check is not initialized on native — native uses `@capacitor-firebase/app-check` separately, which `httpsCallable` cannot consume). Practical consequence: any future native need to write banner metrics **must continue to use the HTTP endpoint**, not the callable. This plan introduces no client caller for the callable; the `enforceAppCheck: true` change protects only against direct/external/web-only callers.

**Client changes (production hot path):**
- Update `src/features/dashboard/api/trackHomeBannerMetricApi.ts` to call `getAppCheckTokenOrNull()` before the `fetch` and attach `X-Firebase-AppCheck: <token>` to the request headers. Mirror the pattern in `src/api/growthAnalytics.ts:41-64`.
- If `getAppCheckTokenOrNull()` returns null in production (App Check unavailable / init failure / native token fetch failure), **skip the metric** — do not send a header-less request that the server would reject. Match the existing fire-and-forget semantics: silent failure, no queueing, no retry, no noisy log.
- Do not touch the `Env.shouldUseEmulators()` early-return; the E2E behavior is covered below.

**Local/emulator behavior — decision (no verifier bypass).** Test boundary differs by transport because the two enforcement points are not the same:
- **HTTP `trackHomeBannerMetricHttp` (handler-owned check)**: we write the `X-Firebase-AppCheck` validation in the handler body. Mirror `RouteHandlerDeps.verifyAppCheckToken` in `trackGrowthRouteMetric.ts:53-58`; inject a stub verifier via handler deps and cover success, `app_check_required`, and `app_check_invalid` (401) paths in unit tests.
- **Callable `trackHomeBannerMetric` (framework-enforced)**: `enforceAppCheck: true` is enforced by the Firebase Functions platform **before** the handler runs. Handler-dep injection would test a fake boundary the framework never invokes. Cover the callable solely via an emulator integration test that invokes the callable with and without a valid App Check token and asserts the SDK-level rejection (`functions/unauthenticated` or equivalent), not handler internals. Do **not** add a handler-level verifier interface to the callable purely for testing. The staging smoke below does **not** cover the callable — it has no client caller in this repo, so there is no production path to smoke.
- **Local E2E in emulator**: `trackHomeBannerMetricHttp` is invoked by E2E (unlike `trackGrowthRouteMetric`, whose web client short-circuits in emulator mode at `src/api/growthAnalytics.ts:42`). To exercise the real App Check path on the HTTP transport, either (a) drop the `Env.shouldUseEmulators()` early-return for E2E builds and rely on `FIREBASE_APPCHECK_DEBUG_TOKEN` so `getAppCheckTokenOrNull()` returns a debug token, or (b) keep the early-return and cover App Check only via the handler unit tests + staging smoke. Pick (a) only if E2E coverage of the live App Check round-trip is required; otherwise prefer (b) and document the gap. Do **not** add an emulator-only verifier bypass in the function or callable.
- **Staging smoke**: real App Check tokens (no debug token), per the smoke step in Manual verification.
- Document the `FIREBASE_APPCHECK_DEBUG_TOKEN` value source and how to obtain it in the E2E runbook so the loop does not regress to silent skipping.

### 4. HTTP URL validation for card art
- Add a shared Zod refinement for `cardArtUrl` in `functions/src/contracts/callableInputs.ts` (currently `z.string()` with no scheme validation at lines 283, 304, 382).
- Allowed schemes by environment:
  - **production / hosted**: `/local-path` (relative) and `https://` only
  - **dev / emulator**: additionally allow exactly these hosts over `http://`: `localhost`, `127.0.0.1`, `10.0.2.2`, `10.0.3.2`. No other `http://` hosts permitted.
- Update `src/shared/lib/resolveCardArtUrl.ts` so hosted/prod does not pass through remote `http://`; only relative paths, `https://`, and the explicit dev/emulator host list above.
- Do **not** rely on `firestore.rules` for URL scheme validation — keep enforcement in callable input contracts and the client resolver.

## Test Plan

### Unit and contract tests
- Analytics facade queues early web events and flushes them after analytics initializes; flush order preserved.
- Analytics facade remains safe (no throw, no unbounded queue) when `isSupported()` resolves false.
- Signup emits `auth_sign_up_*` events; sign-in emits `auth_sign_in_*` events; the two paths do not collide.
- Firebase error codes are normalized to stable snake_case codes before being sent as `error_code`.
- GA4 event params no longer include raw Firestore document IDs (`card_id`, `user_card_id`, `tracking_id`, `benefit_id`).
- Card add and benefit usage failure paths emit the new coarse failure events with the intended dimensions.
- `trackHomeBannerMetricHttp` handler (with stub verifier injected via deps): rejects missing App Check (`401 app_check_required`), rejects invalid App Check (`401 app_check_invalid`), and accepts valid App Check (then proceeds to rate-limit + write).
- Client emitter `trackHomeBannerMetricApi.ts`:
  - when `getAppCheckTokenOrNull()` returns a string, the outgoing `fetch` includes `X-Firebase-AppCheck: <token>`
  - when it returns `null` in production, **no `fetch` is issued** (skipped silently to match fire-and-forget semantics; no header-less request that the server would 401)
  - emulator early-return still applies and the function is not called
- Callable `trackHomeBannerMetric` is **not** unit-tested via handler-dep stubs because `enforceAppCheck: true` is framework-enforced before the handler runs, and no current client uses the callable. Covered solely by an emulator integration test that invokes the callable with and without a valid App Check token and asserts the SDK-level error. Not covered by the staging smoke (no client caller exists to smoke against). The callable must still preserve guest invocation (signed-in not required).
- `cardArtUrl` Zod schema accepts production-safe URLs (`https://...`, `/local/path`) and rejects remote `http://` outside the four dev/emulator hosts.

### Integration/smoke
- `AuthProvider` still sets analytics user id for non-anonymous users, clears it for anonymous and signed-out users, and runs `setAnalyticsUserId` before `auth_link_result` on guest upgrade.
- Home banner still emits both GA4 client events and existing server metric writes (`bannerMetrics` counter increment) — no regression in dual-tracking.

### Manual verification
- Staging web GA DebugView shows `route_view`, signup (`auth_sign_up_*`), card add (`card_add_*`), benefit usage (`benefit_mark_*`), home banner (`home_banner_*`), and `client_error` events.
- Android staging build GA DebugView shows the same event set via native Firebase Analytics.
- TestFlight/iOS build GA DebugView verifies Capacitor Analytics emits events from the bundled local plist/config artifact.
- **Staging App Check smoke for home banner metrics** (treat as separate from GA DebugView; GA event visibility is not an App Check signal). Scope is the HTTP endpoint only — the callable has no client caller in this repo and its enforcement is covered by the emulator integration test in §3.
  - guest session with valid App Check token: client emitter `trackHomeBannerMetricApi.ts` calls `trackHomeBannerMetricHttp` with `X-Firebase-AppCheck`; server returns 2xx; `bannerMetrics` counters increment in Firestore. Verify on both web (JS App Check token) and native (Capacitor App Check token) sessions.
  - missing or forged App Check token: server returns 401 (`app_check_required` or `app_check_invalid`) and `bannerMetrics` counters do not increment.
  - judge App Check from HTTP response + Firestore counter behavior, not GA DebugView.

## Assumptions
- GA4 is the client funnel / product behavior signal; Firestore + admin Cloud Function metrics are the authoritative source for operational aggregates. This pass does not change that division.
- Existing home banner dual-tracking (GA4 client + `bannerMetrics` server) is preserved as-is. The work in §3 is layering App Check on top of the existing server path, not redesigning it.
- App Check is already initialized for web (JS `appCheck`) and native (`@capacitor-firebase/app-check`) in this app. The two are separate instances and `httpsCallable` reads only the JS one — see §3 for the consequence (callable is web-only, banner metric hot path is HTTP). If staging smoke shows tokens are not flowing on the HTTP path, fix App Check init or `getAppCheckTokenOrNull()` behavior first — do not weaken the server-side `enforceAppCheck` / `X-Firebase-AppCheck` requirement.
- The Firebase error code surface used for taxonomy normalization is treated as non-PII; the normalization is for low-cardinality, stable analytics codes, not for redaction.

## Out of scope
- **iOS `GoogleService-Info.plist`**: gitignored per-machine / per-CI artifact. Fixing `IS_ANALYTICS_ENABLED=false` is a config follow-up — re-download from Firebase Console, sync to developer machines and CI/release pipeline, then verify with TestFlight + GA DebugView. Not an implementation task in this plan.
- **Home banner server metrics redesign**: preserved, not refactored.
- **BigQuery export / server-side GA Measurement Protocol / new analytics vendor**: not introduced.
- **Consent / opt-out UI**: deferred to a separate product + legal decision.
- **Firestore rules URL validation**: explicitly rejected; enforcement stays in callable input contracts and the client resolver.
