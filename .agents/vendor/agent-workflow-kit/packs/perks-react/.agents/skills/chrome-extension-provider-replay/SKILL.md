---
name: chrome-extension-provider-replay
description: Use when working in perks-react on Perkmon Chrome extension provider recording, Amex/Chase/Citi/Capital One/US Bank/BoA/membership provider mock data, merchant alert local replay, raw issuer captures under tmp/provider-recordings, isolated extension replay profiles, or provider sync/fanout debugging without live third-party logins.
---

# Chrome Extension Provider Replay

## Purpose

Use local provider captures to develop and test the Perkmon Chrome extension without repeatedly logging into issuers. Keep real provider sessions and raw data local-only; run extension replay from isolated mock profiles.

Load [references/provider-artifacts.md](references/provider-artifacts.md) when you need the provider matrix, exact artifacts, or Amex-specific endpoint details.

## GitHub Sync Boundary

This skill and its references are safe to keep in Git. Raw captures and browser profiles are not.

- Commit this skill, `e2e/extension` replay tooling, provider recipes, sanitized fixtures, redaction reports, and docs.
- Do not commit `tmp/provider-recordings/raw/...`, `tmp/chrome-extension-profiles/...`, live Chrome profiles, cookies, auth headers, tokens, HARs, screenshots with account data, or unsanitized provider HTML/API bodies.
- To make another checkout usable, promote manually reviewed and sanitized scenarios into `e2e/extension/fixtures/providers/<provider>/<scenario>/`, then run the fixture/mock lanes there.
- If a raw local scenario is still needed, recreate it in that checkout through the recording workflow. Do not use GitHub as the transport for raw issuer data.

## Fresh Checkout Dev UX

A fresh GitHub checkout should be useful without local raw captures. Use the
committed generic fixtures, legacy Amex fixtures, and synthetic smoke fixtures
first.

List available provider/scenario pairs and their source:

```bash
npm run dev:extension:provider:mock -- --list
```

Run manifest, fixture, and generic mock smoke gates:

```bash
npm run record:extension:providers:validate
npm run test:e2e:extension:provider:fixtures
npm run test:e2e:extension:provider:mock
```

Open a headed local replay browser. When a provider has exactly one committed
scenario, or a known preferred scenario such as `main-happy` or
`main-happy-cdp`, the dev runner selects it automatically:

```bash
EXTENSION_PROVIDER_MOCK_EXIT_AFTER_READY=true npm run dev:extension:provider:mock -- --provider citi
EXTENSION_PROVIDER_MOCK_EXIT_AFTER_READY=true npm run dev:extension:provider:mock -- --provider hyatt
npm run dev:extension:provider:mock -- --provider citi
```

Synthetic smoke fixtures are intentionally shallow. They prove extension load,
sidepanel shell, provider page routing, and `readySelector` visibility for
providers that do not yet have sanitized recorder output. Keep sync-state,
Offer Console, and action assertions provider-specific until a scenario has
enough sanitized data to support them.

## Core Boundary

- Never request, type, store, or inspect provider credentials or MFA values.
- Use a user-controlled headed Chrome profile only for real login and recording.
- Do not automate live provider UI interactions to mimic a person, bypass anti-automation, or reduce fraud detection signals.
- Use an isolated agent/test Chrome profile for replay and automated extension testing.
- Keep raw captures, Chrome profiles, cookies, tokens, HARs, account numbers, account proxies, and screenshots with real account data out of git.
- Store raw captures only under `tmp/provider-recordings/raw/<provider>/<scenario>/`.
- Promote to `e2e/extension/fixtures/providers/<provider>/<scenario>/` only after manual review and sanitization.

## Live Provider Interaction Safety

When a real third-party provider session is open, prefer human-operated actions and passive recording.

- Ask the user to log in, complete MFA, navigate, open detail views, switch accounts, or click any action that changes account/provider state.
- Do not type credentials, submit login forms, or click MFA prompts.
- Do not click activation/enroll/add buttons on live provider pages unless the user explicitly approves the exact provider-state-changing action for the current capture.
- Do not add random jitter, mouse movement, or timing tricks for the purpose of appearing human or avoiding provider bot detection.
- Wait for explicit user confirmation such as `done` before capture or closure steps that depend on the live session state.
- Pace allowed agent-side live-session steps conservatively: wait at least 2 seconds between agent-initiated capture/navigation/closure operations. This is a deterministic safety settle, not a random human-mimicry strategy.
- Use conservative deterministic waits only for page stability, for example waiting for network idle, a selector, or a documented post-sync capture window.
- Keep automated clicking, fanout probes, sync assertions, and rapid iteration inside isolated local replay profiles where provider traffic is mocked.

## Coverage Escalation

Optimize for complete artifacts within the safety boundary. Do not mark a provider capture complete until the provider recipe's required artifacts are present and replay has exercised them.

Default to a user-convenient session-first workflow: one human login should be enough for one provider. Keep the headed recording browser open while capture, gap analysis, and any same-session supplemental captures run. Do not ask the user to log in again unless the provider has actually expired the session, blocked the profile, or redirected the already-open authenticated page back to login.

If required artifacts are missing:

1. Re-read the provider recipe and identify the exact missing page/request/DOM artifact.
2. First try to fill the gap in the same open browser session and same recording profile; do not close/reopen Chrome just to run a second capture.
3. Increase deterministic capture windows such as `PROVIDER_RECORDING_POST_SYNC_WAIT_MS` when extension-triggered fetches are still in flight.
4. Ask the user to manually navigate, open detail/modal/account states, switch accounts, or approve a specific state-changing capture action when that exact action is required to observe the endpoint.
5. Use ordinary headed Chrome with a dedicated recording profile plus CDP attach when Playwright-controlled Chrome is blocked, suppresses the provider flow, or loses provider session state across restart.
6. Capture a URL inventory and response shape metadata to detect endpoint drift without dumping raw token-bearing bodies into logs.
7. Update provider-specific request matchers or DOM probes when drift is confirmed.
8. Run raw replay and headed raw dev smoke before reporting the capture as usable for development.

If a method would require agent-handled credentials, MFA automation, cookie/token copying, or anti-detection stealth, stop and route through human-operated recording plus local replay instead.

## First Checks

From the repo root:

```bash
git status --short
git log -1 --oneline
git ls-files tmp/provider-recordings tmp/chrome-extension-profiles
npm run record:extension:providers:validate
node e2e/extension/record-providers-capture.mjs --dry-run --providers all
```

Confirm raw paths are untracked before and after every run. Leave unrelated dirty files alone.

## Recording Workflow

1. Select providers from `e2e/extension/providerRecordingManifest.mjs`.
2. Before opening Chrome, print the full provider artifact checklist from the recipe. Tell the user exactly which live page states they may need to open after login.
3. Prefer a session-first recorder flow. The repo currently has separate prepare/capture commands, but some providers lose authenticated state when the Playwright browser is closed and reopened. In those cases, keep the same headed browser alive and capture through CDP or a same-session supplement instead of asking for another login.

   Prepare the headed recording profile:

   ```bash
   PROVIDER_RECORDING_PROVIDERS=amex,chase,citi npm run record:extension:providers:prepare
   ```

4. Have the human log in, complete MFA, and perform any required live provider navigation manually in the headed recording profile.
5. If the provider is known to persist session state across restart, capture raw inputs with the repo capture command:

   ```bash
   PROVIDER_RECORDING_PROVIDERS=amex,chase,citi npm run record:extension:providers:capture
   ```

6. If the provider may expire on restart, capture from the still-open session instead. Use ordinary headed Chrome with a dedicated profile and a local remote-debugging port, or attach to the live Playwright session when available:

   - open normal Chrome, headed, with a dedicated profile under `tmp/chrome-extension-profiles/...`
   - attach a recorder to `http://127.0.0.1:<debug-port>` through CDP
   - let the user log in manually
   - let the user navigate to the target page and open any required detail/modal/account states
   - keep the browser open while checking `capture-manifest.json`
   - save hydrated page snapshots and selected response bodies under `tmp/provider-recordings/raw/...`
   - if required artifacts are missing, fill them immediately in the same browser session
   - wait at least 2 seconds between allowed agent-side capture steps on the live session
   - close the debug Chrome only after capture finishes or the user confirms it is okay, then verify no debug-port process remains

7. Immediately inspect `capture-manifest.json`. If `completion.status !== "complete"`, report the exact missing artifacts and continue same-session supplemental capture before moving to another provider.
8. For providers with in-page details, capture both the main page and detail/modal states. Large issuer pages may exceed one-shot HTML limits; chunk reads or capture named DOM sections.
9. Treat recording as incomplete until every required artifact in the provider recipe is present and a raw replay has exercised the Chrome extension path that will be used for development. A dashboard HTML file alone is not enough.

## Provider Restart Sensitivity

Some providers restore login state after closing and reopening the recording profile; others do not. Use the least annoying path for the user:

- **Session-first required:** Capital One. Do not rely on closing `prepare` and reopening `capture`; its `myaccounts` session can redirect back to `verified.capitalone.com/auth/signin` even when a prior capture was authenticated.
- **Session-first preferred:** Amex and any provider that blocks Playwright-controlled login, requires in-page detail/modal states, or has cross-origin redirects.
- **Two-command acceptable only when proven:** Chase-like providers where the dedicated recording profile remains authenticated after restart and manifest completion is repeatable.

When unsure, keep the recording browser open and capture/verify in the same session. The user's login is the expensive step; spend agent time on manifest checks and same-session supplements.

## Capital One Session-First Capture

Capital One is `cross_origin_api` and must be handled as a two-stage flow:

1. While the authenticated `myaccounts.capitalone.com` tab is still open, capture:
   - `pages/myaccounts.html`
   - `myaccounts/customer-accounts.*`
   - `myaccounts/shopping-eligibility.*`
   - `redirect/tile-definition.*`
2. Extract the `capitaloneoffers.com/feed...` redirect URL from the `tile-definition` response in memory or from the local raw file. Do not navigate to plain `https://capitaloneoffers.com/`; it commonly lands on `/login`.
3. In the same authenticated session, open the feed redirect and capture:
   - `pages/offers-origin.html`
   - `offers-origin/user-accounts.*`
   - `offers-origin/feed.*`
4. Only then write or update `capture-manifest.json` as `complete`.
5. Run raw dev/replay from an isolated profile. If the extension parks in `awaiting_match`, that can be a valid proof of first-stage sync when no test-wallet mapping exists; feed-stage proof still requires the raw `user-accounts` and `feed` artifacts to be present.

Do not ask the user to repeat Capital One login just because a reopened capture profile returns to `verified.capitalone.com/auth/signin`. Treat that as a workflow failure and switch to same-session/CDP capture.

## Amex Minimum Capture

Capture these raw artifacts:

- main offers HTML with the dashboard/card discovery state, often `window.__INITIAL_STATE__.productsList`
- hydrated offers list HTML containing `data-testid="listViewContainer"` and `merchantOfferListAddButton`
- optional detail/modal HTML
- `ReadOffersHubPresentation.web.v1` response body
- `CreateCardAccountOfferEnrollment.v1` response body when available
- `CreateOffersHubEnrollment.web.v1` response body when fallback enrollment is tested
- for Amex add/fanout work, a post-mutation `ReadOffersHubPresentation.web.v1` response after an approved add/enroll; synthesize a sanitized fixture when live capture is not explicitly approved

For Amex, route both `global.americanexpress.com` HTML and `functions.americanexpress.com` API endpoints. The extension uses page HTML for login/card discovery and injected UI, plus API responses for offer sync and fanout.

## Raw Replay Workflow

Use raw replay to validate whether the capture is sufficient before sanitizing anything.

1. Build the extension:

   ```bash
   set -a
   [ -f .env.staging ] && source .env.staging
   [ -f .env.staging.local ] && source .env.staging.local
   set +a
   npm --prefix apps/chrome-extension run build:staging
   ```

2. Create a temporary Playwright config/spec under the raw scenario directory, not under tracked fixtures.
3. Disable `trace`, `screenshot`, and `video` because failures can contain real account data.
4. Launch the extension with `launchExtensionContext({ profileDir: testInfo.outputDir + '/profile' })`.
5. Sign into Perkmon staging using the repo E2E env, then `primeExtensionQaState` for the provider.
6. Route provider HTML/API requests to raw files. Fail closed on unexpected provider network if safety matters.
7. Verify the behavior with non-sensitive assertions:

   - page shell/list appears
   - sidepanel provider card, icon, sync/reset buttons, and expected provider controls render
   - provider sync reaches `done` or `awaiting_match`
   - required API/DOM artifacts are actually exercised by the extension, not just present on disk
   - injected buttons or launcher appear when expected
   - direct debug message probe succeeds for fanout-like flows
   - UI click succeeds against mocked enroll response
   - add/fanout flows reload or reread offers after the mocked mutation, then assert added rows show `Added on N cards`, the Add action is disabled or zero-target, and fully added offers no longer count as Available

8. For local development, document or create the headed replay command/profile that lets an agent or developer iterate without a live provider login.
9. Delete Playwright test output/profile directories after the run unless the user explicitly wants to keep a headed dev profile open.

When a read-only sync parks in `awaiting_match`, run fanout/add tests in a fresh isolated profile. An active provider run can legitimately block fanout with `active_run`.

## Merchant Alert Replay

Use this lane for merchant alert E2E work. It is a synthetic merchant-page replay, not a real issuer/provider capture.

- Do not ask the user to log into a merchant site for this flow.
- Do not add a live merchant to `providerRecordingManifest.mjs`; merchant replay uses synthetic HTML and extension-local state.
- Do not seed `perkmon_offer_alert_cache` for production E2E coverage. The production alert path is local-first: it reads active offers from the extension-origin IndexedDB store and opens the local Offers surface.
- Keep fixtures synthetic. A committed scenario can live under `e2e/extension/fixtures/providers/merchant/<scenario>/`, but it should contain only a static merchant HTML page and optional harmless assets.

Use a concrete merchant scenario catalog instead of a generic fake host when the goal is local E2E confidence. Keep the catalog small and representative:

- Uniqlo: navigate to `https://www.uniqlo.com/us/en/...`, seed `domainSld: 'uniqlo.com'`, expect an alert.
- Nike: navigate to `https://www.nike.com/...`, seed `domainSld: 'nike.com'`, expect an alert.
- lululemon: navigate to `https://shop.lululemon.com/...`, seed `domainSld: 'lululemon.com'`, expect an alert for subdomain-to-root matching.
- Dell: navigate to `https://www.dell.com/en-us/...`, seed `domainSld: 'dell.com'`, expect an alert even if the live site blocks headless probes.
- Target: navigate to `https://www.target.com/...`, seed `domainSld: 'target.com'`, expect an alert.

For optional live host probes, open only public merchant pages and record final URL/status/title. Do not save live HTML, screenshots, cookies, localStorage, or account/session state. The E2E assertion must use routed synthetic HTML for the merchant page so it is deterministic and does not depend on the merchant's anti-bot behavior.

When creating or updating the merchant alert E2E spec:

1. Build the extension as usual:

   ```bash
   npm --prefix apps/chrome-extension run build:staging
   ```

2. Launch an isolated profile with `launchExtensionContext` from `e2e/extension/support/extensionContext.ts`, open the side panel, and sign in with `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` only if the assertion needs the side panel after clicking the toast.
3. Seed the extension gates from the extension origin before opening the merchant page:

   ```ts
   await sidepanel.evaluate(() => chrome.storage.local.set({
     perkmon_capability_settings: {
       syncOffers: true,
       syncSnapshots: true,
       reconciliation: false,
       merchantToast: true,
       merchantToastIntensity: 'heavy',
     },
     perkmon_remote_config: {
       config: {
         providers: {},
         killSwitchUntilMs: null,
         knownEndpointVersion: null,
         configTtlMs: 20 * 60 * 1000,
         localFirstOffers: true,
       },
       fetchedAt: Date.now(),
       serverSkewMs: 0,
     },
   }))
   ```

4. Seed the `perkmon-offers` IndexedDB from the side panel page (same extension origin as the service worker). The record must match `LocalOfferRecord` enough for `queryActiveByMatchedDomain`:

   - `domainSld` equals the normalized merchant host, for example `merchant-alert.test`
   - `merchantUrl` uses that host
   - `matchStatus: 'matched'`
   - `lifecycleStatus: 'active'`
   - `expiresAt` is null or in the future
   - include `activationStatus`, `redemptionChannel`, and `sourceExpiresOn` when testing toast copy
   - include sensitive fields such as `sourceCardLast4`, `linkedUserCardId`, and `offerFingerprint` in the stored record when asserting they do not appear in the injected page

5. Route a synthetic merchant page, for example `https://merchant-alert.test/checkout`, with `context.route(...)`, then `page.goto(...)`. The tab navigation should trigger the service worker's merchant alert listener.
6. Assert the non-sensitive page behavior:

   - `#perkmon-offer-alert` appears on the merchant page
   - the open shadow root contains merchant, issuer, value, status/channel/expiry copy
   - the shadow text does not contain card last4, `linkedUserCardId`, fingerprints, emails, auth tokens, or raw debug data
   - the primary action sends the side-panel open message and the side panel lands on Offers with the active merchant domain pinned
   - "Don't show here" persists the ignored host and a reload does not show the toast

7. Keep trace, screenshots, and video off for any run that combines merchant replay with raw provider captures. Synthetic-only merchant specs may use ordinary Playwright artifacts if they contain no real provider or account data.

For headed local iteration, prefer a small committed merchant scenario plus a spec or helper over live merchant browsing. If adding a `--provider merchant` dev lane, make it seed the capability settings, cached `localFirstOffers` remote config, and IndexedDB record before opening the merchant page; the generic provider mock runner alone is not sufficient.

## Local Development Entry

Use the committed fixture lane when a sanitized fixture exists:

```bash
npm run dev:extension:provider:mock -- --provider chase
```

Use the raw local lane when validating a newly captured local-only scenario:

```bash
PROVIDER_REPLAY_RAW_ROOT=tmp/provider-recordings/raw/chase/main-happy-sync-long \
  npm run dev:extension:provider:raw -- --provider chase
```

The raw lane must read only from `tmp/provider-recordings/raw/...`, launch only an isolated profile under `tmp/chrome-extension-profiles/...`, and refuse incomplete raw captures.

## Reporting

Report:

- exact commands and pass/fail results
- raw scenario paths used
- whether raw data stayed only under `tmp`
- whether fixture files changed
- whether post-mutation reread classification was verified for add/fanout flows
- whether temporary profiles/test outputs were deleted
- endpoint or DOM gaps, such as missing read endpoint, fallback-only enroll, CORS/replay mismatch, selector drift, anti-automation login blockage, or mutation succeeded but post-reread classification was not verified

Do not paste raw HTML/API bodies or token-bearing logs. Redact auth/token/account proxy details when summarizing failures.
