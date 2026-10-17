---
description: Verify Perkmon staging native shells on local iOS and Android simulators with authorized login, explicit device binding, trustworthy evidence, and credential-safe cleanup
---

# Native Staging Verification

Use this workflow for staging-only Capacitor shell verification on a local iOS Simulator, Android Emulator, or both. It does not deploy, alter staging data beyond the authorized E2E login, request notification permission by default, or replace web product-journey testing.

## Prerequisites and Boundaries

- Work from the checkout whose HEAD must be tested.
- Use `E2E_REMOTE_ENV=staging` and a staging build.
- Require explicit user authorization before submitting `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` to staging.
- Source `.env.staging` and `.env.staging.local` without echoing values. Accept credentials already present in the shell.
- Use existing native runners, `docs/native-testing.md`, and `maestro/flows/` as the technical source of truth.
- Keep the run local. Do not add native simulator execution to CI.
- Do not deploy, modify product code, or repair the harness during a verification-only request.
- Do not use real Apple, Google, payment, bank, hotel, or other third-party login.

## 1. Establish the Target

Record the starting state:

```bash
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
```

Record:

- expected commit or ref
- `NATIVE_BUILD_MODE=staging`
- requested platforms; default to both when the user does not narrow the scope
- pre-existing dirty paths, kept separate from verification artifacts

If a hosted build marker matters to the request, verify it read-only. A mismatch blocks readiness for the requested target; it does not authorize a deployment.

## 2. Prepare Credentials Safely

Load the staging environment without printing secrets:

```bash
set -a
source .env.staging
[[ -f .env.staging.local ]] && source .env.staging.local
set +a
```

Check only whether required variables are set. Never print their values or copy them into reports, screenshots, filenames, or committed files.

Before credential entry:

1. Launch with cleared app state.
2. Confirm the staging sign-in screen and the email/password controls are reachable.
3. Confirm no system alert obscures the controls.
4. Stop if authorization is absent or the selectors cannot be confirmed.

## 3. Bind Exact Devices

### iOS

Resolve the exact Simulator UDID:

```bash
xcrun simctl list --json devices available
```

Set `IOS_SIMULATOR_UDID` to the chosen available iPhone UDID and use that same value for `simctl`, `xcodebuild -destination`, and Maestro. Every Maestro command must include:

```bash
maestro --device "$IOS_SIMULATOR_UDID" test ...
```

The current iOS runner may select the Xcode destination without forwarding it to Maestro. Until the runner itself guarantees forwarding, use the runner only with `IOS_SKIP_MAESTRO=true` for build/install or XCUITest stages, and invoke Maestro directly with `--device`.

### Android

Use a Maestro-supported emulator API from `docs/native-testing.md`. Record the exact `adb` serial and ensure the runner log confirms the same device. The Android runner already passes its selected serial to Maestro; if multiple supported emulators are running and selection is ambiguous, stop extras or invoke the desired flow directly with:

```bash
maestro --device "$ANDROID_SERIAL" test ...
```

Do not use an unsupported API override for a readiness result. An unsupported emulator is `ENVIRONMENT`, not a product failure.

## 4. Build and Install Staging

Build the staging web bundle, sync the selected native platform, assemble with the existing runner, and install on the recorded device. Do not deploy Firebase.

For iOS, separate build/install from Maestro so explicit device binding remains guaranteed. For Android, the existing runner may own build, install, and its explicitly bound Maestro stages.

Record:

- build command and exit result
- installed app path or APK path
- bundle/package ID
- exact Simulator UDID or emulator serial

Do not treat an older previously installed app as evidence for the current HEAD.

## 5. Run Staged Shell Checks

Keep evidence stages independent so one fragile interaction does not obscure earlier results.

### Stage A: Login

1. Reconfirm the email input before typing.
2. Enter the email only and verify it stayed in the email field.
3. On iOS, use the native keyboard accessory down arrow to move to password.
4. Enter the password and confirm it remains masked.
5. On iOS, dismiss the keyboard with the accessory completion control.
6. Submit separately and wait for the authenticated shell.

Do not depend on `Tab` to move focus or `Enter` to submit on iOS. Text or label taps can race WebView focus and append password text to the email field.

### Stage B: Session Restore

Stop and relaunch the app without clearing state. Confirm the authenticated shell returns without another credential submission.

### Stage C: Route Navigation

Use the Native Route Dock and verify at least Cards and Settings.

iOS accessibility may expose a visual value such as `Route: /cards` as separate `Route:` and `/cards` nodes. Prefer a stable ID when available; otherwise assert the label and path separately. Do not require a combined text node.

Button text taps can occasionally focus without activating. Confirm the route actually changed before recording a pass.

### Stage D: Deep Link

Start from a route different from the target, then open the platform deep link:

- iOS: `perkmon://app/settings`
- Android: the requested target, normally `perkmon://app/cards`

Assert the visible landing page or visible route marker before hiding the dock. Do not hide the only route evidence and then assert it.

For Android, use the real `adb shell am start` foreground intent when testing `appUrlOpen`; a synthetic history change is not equivalent.

### Stage E: Native Diagnostics

On Settings, confirm:

- route
- authenticated state
- platform marker
- push permission state
- request-observed state
- absence of plugin-load error

By default, verify diagnostics only. Do not tap the push-permission request button, accept a system prompt, or claim real notification delivery.

### Stage F: Platform-Native Test

- iOS: run the lifecycle XCUITest against the same UDID.
- Android: run the shell instrumentation test against the same serial.

Keep platform-test results separate from Maestro results. A stale instrumentation contract is `HARNESS` when current configuration and independent runtime evidence agree that the product is behaving as configured.

## 6. Handle Fragile UI Evidence

Do not accept `scrollUntilVisible` as proof that an element is in the usable viewport. WKWebView accessibility can report offscreen content as visible.

When scrolling is necessary:

1. Capture a screenshot.
2. Use one controlled full swipe to establish direction.
3. Use short, slow swipes to position the target.
4. Capture another screenshot and confirm the element is actually visible.
5. Record the assertion only after visual and accessibility evidence agree.

Prefer stable test IDs and diagnostics state over product copy. Use page headings only when the route dock is hidden or inaccessible and the heading is the best independent landing proof.

## 7. Classify Failures

Classify each failure before deciding the gate:

- `PRODUCT`: current app behavior is wrong and is corroborated by at least two independent signals, such as route diagnostics plus screenshot, real platform intent plus page state, or repeatable foreground behavior.
- `HARNESS`: selector, accessibility assumption, expected origin, or test contract disagrees with current source/configuration while independent evidence shows correct product behavior.
- `ENVIRONMENT`: unsupported emulator API, missing toolchain, unavailable simulator, build-host problem, or staging reachability issue prevents a valid observation.

Historical symptoms are diagnostic hints, not current facts:

- A foreground Android deep link that returns to Dashboard instead of its target may be a product regression. Reproduce it with the current build and a real intent.
- An Android instrumentation assertion for `capacitor://localhost` may be stale if the current Capacitor runtime/configuration uses `https://localhost`. Inspect current configuration and runtime evidence before classification.

Do not repeatedly rerun a reproducible product failure until it disappears. Do not let a separate harness failure erase an already corroborated product finding.

## 8. Clean Sensitive Artifacts

Maestro debug directories can persist environment values passed with `-e`. Treat all generated JSON, logs, screenshots, and copied flows from credentialed stages as sensitive until checked.

For each exact run directory, list files containing the credential values without printing matches:

```bash
rg --hidden -a -l -F -- "$E2E_TEST_EMAIL" "$RUN_DIR"
rg --hidden -a -l -F -- "$E2E_TEST_PASSWORD" "$RUN_DIR"
```

Delete only the exact generated files or run directories that contain credentials. Repeat both scans until they return no paths. Also inspect any exact temporary directory created for the run.

Clear authenticated app state after the test:

- iOS: clear or uninstall the app on the exact Simulator UDID.
- Android: clear the package on the exact emulator serial.

Confirm the app returns to the signed-out welcome screen. Retain only credential-free screenshots and reports. Never include the E2E email or password in the final response.

## 9. Recheck Repository State

Record the ending state:

```bash
git rev-parse HEAD
git status --short
```

Confirm:

- HEAD did not move unexpectedly
- no credentials or generated native artifacts were added to Git
- pre-existing dirty changes remain intact
- verification-created files are either intentional credential-free evidence or removed

## Report

Write a compact Chinese report with:

1. `目标和环境`: HEAD, staging mode, platforms, exact devices, bundle/package IDs.
2. `构建和安装`: commands and `PASS`/`FAIL`/`NOT_RUN`.
3. `iOS`: login, restore, routes, deep link, diagnostics, XCUITest, and evidence.
4. `Android`: login, restore, routes, deep link, diagnostics, instrumentation, and evidence.
5. `问题分类`: separate `PRODUCT`, `HARNESS`, and `ENVIRONMENT`.
6. `安全清理`: credential scan, removed sensitive artifacts, app-state reset, retained safe evidence.
7. `仓库状态`: final HEAD and unrelated dirty paths.
8. `结论`: `PASS`, `HOLD`, or `BLOCKED`.

Use `HOLD` when a corroborated native product regression blocks readiness. Use `BLOCKED` when missing authorization or environment constraints prevented the required observation. Do not claim checks that were not run.
