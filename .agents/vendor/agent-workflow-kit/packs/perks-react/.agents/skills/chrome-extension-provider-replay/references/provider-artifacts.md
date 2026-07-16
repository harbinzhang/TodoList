# Provider Artifacts Reference

## Provider Families

Use `e2e/extension/providerRecordingManifest.mjs` as the source of truth. Common capture modes:

- `api`: save logged-in page shell plus required REST responses.
- `cross_origin_api`: save the main account page and API responses from alternate origins.
- `graphql`: save one request/response pair per `operationName`.
- `dom_switcher`: save account switcher state and per-account page/probe/offers.
- `membership_dom`: save account page HTML plus normalized values/probes.
- `shadow_dom`: save normal DOM probes plus deep selector samples.
- `disabled_dom`: manual DOM only; do not trigger extension sync until runtime support is restored.

Default recording posture: keep the authenticated headed browser open until required artifacts are complete. The separate repo `prepare` and `capture` commands are convenient only for providers that keep session state across restart. If a provider redirects to login after reopening the same profile, switch to same-session capture or CDP attach instead of asking the user to log in again.

## Raw Artifact Layout

Use:

```text
tmp/provider-recordings/raw/<provider>/<scenario>/
  capture-manifest.json
  pages/*.html
  dom/*.probe.json
  dom/*.values.json
  api/*.request.json
  api/*.response.json
  graphql/*.request.json
  graphql/*.response.json
  accounts/<index>/...
```

Save request shapes with sensitive headers removed. Do not save cookies, auth headers, bearer tokens, id/refresh tokens, MFA values, browser storage, Chrome profiles, raw HARs, raw account numbers, raw account proxy ids, or screenshots containing real account data.

## Provider Matrix

Minimum artifacts by provider:

- Amex: offers HTML, optional detail/modal HTML, `ReadOffersHubPresentation`, optional enroll primary/fallback, and post-add `ReadOffersHubPresentation` for add/fanout coverage.
- Chase: dashboard HTML, accounts list API, customer offers API, optional reco/enroll click.
- Citi: dashboard HTML, account details API, merchant offers API, optional enrollment APIs.
- Capital One: myaccounts page, optional offers-origin page, customer accounts, eligibility, tile-definition, user-accounts, feed.
- U.S. Bank: dashboard HTML, GraphQL request/response split by `operationName`.
- Bank of America: customer-deals page, account switcher options, per-account page/probe/offers.
- PayPal: offers page HTML, offer-card DOM probes/values.
- Hyatt/Hilton/Marriott/IHG/United/Delta/American/Southwest/Frontier: account page plus points/status/certificate or mileage/tier probes.
- Alaska/Bilt: account/wallet page plus shadow DOM deep selector probes.
- Discover: manual dashboard DOM only while disabled.
- Merchant alert: synthetic merchant page plus extension-origin local offer IndexedDB seed; no live merchant login or provider recording.

## Amex Raw Capture Lessons

The successful Amex capture used ordinary headed Chrome with a dedicated local profile and CDP attach because Playwright-controlled login was blocked by issuer anti-automation signals.

Useful raw paths from the proven pattern:

- read-only capture: `tmp/provider-recordings/raw/amex/live-debug-readonly-pages`
- enroll fallback capture: `tmp/provider-recordings/raw/amex/live-debug-enroll-one`
- temporary raw replay: `tmp/provider-recordings/raw/amex/raw-live-replay`

Important details:

- `pages/offers.html` can contain `window.__INITIAL_STATE__.productsList` for dashboard/card discovery even when it lacks hydrated list DOM.
- `pages/offers-02.html` or later hydrated snapshots can contain `data-testid="listViewContainer"` and native add buttons for injected UI.
- `ReadOffersHubPresentation.web.v1` may return `recommendedOffers.offersList.page1`; parse only shape/count/keys in logs.
- After an approved add/enroll, reread `ReadOffersHubPresentation.web.v1` when validating add/fanout. Duplicate offer ids can appear in both `recommendedOffers` and `addedToCard`; replay must prove the console classifies the row as Added, disables Add or reports zero targets, and removes fully added offers from Available.
- If only `CreateOffersHubEnrollment.web.v1` was captured, force the primary endpoint to fail in raw replay to verify fallback behavior.
- Amex page runtime can disable `eval`; avoid `page.evaluate` on raw Amex pages for debug probes. Use the extension service worker and `chrome.scripting.executeScript` instead.
- Split read-only sync and fanout into separate isolated profiles if sync reaches `awaiting_match`; otherwise the provider run gate can reject fanout with `active_run`.

## Capital One Raw Capture Lessons

Capital One is restart-sensitive. A successful `myaccounts` capture can show `https://myaccounts.capitalone.com/accountSummary`, but after closing and reopening the same Playwright recording profile, subsequent runs may redirect to `https://verified.capitalone.com/auth/signin?Product=ENTERPRISE` and extension sync can fail with "Could not confirm your Capital One session." Do not interpret this as the user needing to log in repeatedly; treat it as a recorder workflow problem.

Use one-login same-session capture:

- Capture `myaccounts/customer-accounts`, `myaccounts/shopping-eligibility`, and `redirect/tile-definition` while the authenticated `myaccounts` page is still open.
- Extract the actual `https://capitaloneoffers.com/feed...` redirect from `tile-definition`. Plain `https://capitaloneoffers.com/` often lands on `/login` and will not trigger the required offers-origin APIs.
- Open the feed redirect in the same authenticated browser session and capture `offers-origin/user-accounts` plus `offers-origin/feed`.
- Update `capture-manifest.json` only after all five required request ids are matched.
- For raw UI replay, `awaiting_match` is an acceptable first-stage extension state when no test-wallet mapping exists. It proves the extension read the account side; the raw files must still include `user-accounts` and `feed` for development coverage.

## Replay Safety Checklist

- Raw scenario remains under `tmp/provider-recordings/raw/...`.
- `git ls-files tmp/provider-recordings tmp/chrome-extension-profiles` prints nothing.
- Playwright `trace`, `screenshot`, and `video` are off for raw account data.
- Temporary `test-results` and isolated replay profiles are deleted after the run.
- Debug Chrome profile and remote-debugging port are closed.
- Final report contains paths, command results, and blocker categories, not raw bodies.

## User-Convenience Checklist

- Before login, list every required artifact for the selected provider.
- After login, keep the recording browser open until `capture-manifest.json` is `complete` or a concrete blocker is proven.
- If artifacts are missing, supplement in the same session first: navigate to detail/modal/feed/account-switcher states, extend deterministic waits, or attach CDP.
- Only ask the user to log in again when the existing authenticated tab itself has been redirected to login or the provider has expired the session.
- Do not move to the next provider while the current provider is only partial unless the user explicitly says to skip it.

## Live Session Guardrails

- Live provider pages are for human-operated login/navigation plus passive capture.
- Agent automation must not click live add/enroll/activate controls unless the user has explicitly approved that exact provider-state-changing action for the current capture.
- Do not use random delays, mouse paths, or stealth-like timing to disguise automation. If a provider blocks automation, switch to human-operated recording plus local replay.
- Use deterministic settle waits for capture completeness, such as a documented post-sync wait, selector wait, or network idle wait. On live provider sessions, wait at least 2 seconds between allowed agent-side capture/navigation/closure operations.
- Put all automated assertions, direct message probes, and UI stress checks in local replay profiles with mocked provider traffic.

## Coverage-First Capture Rules

- Missing required artifacts are blockers, not acceptable partial success.
- Prefer longer deterministic waits, explicit extension sync triggers, manual user navigation, and CDP-attached ordinary Chrome before changing fixture expectations.
- For endpoint drift, capture URL inventory and body-shape metadata first; then update provider-specific matchers.
- For in-page details or account switchers, ask the user to open the necessary live state or approve the exact state-changing action before capture.
- Finish only after raw replay and headed raw dev smoke prove the captured artifacts drive the extension path.
