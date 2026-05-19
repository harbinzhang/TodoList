---
name: android-screenshots
description: Capture and upload Play Store screenshots for the Android app across phone, 7-inch tablet, and 10-inch tablet using fastlane screengrab. Use this skill whenever the user mentions Android screenshots, Play Store screenshots, updating store listing images, refreshing app screenshots, or capturing screenshots for Google Play — even if they just say "take screenshots" or "update the screenshots".
---

# Android Screenshots Skill

Captures app screenshots on Android emulators and uploads them to Google Play Store.

## Safety

- Explicit user approval required before uploading to Play Store.
- Never upload screenshots from a debug/broken build. Verify screenshots visually before uploading.

## How It Works

This is a **Capacitor WebView app** — all UI lives inside a WebView. Standard UIAutomator `setText()` and Espresso-Web don't properly trigger React's onChange events. The test uses **JavaScript injection** via `WebView.evaluateJavascript()` to fill inputs and navigate routes.

### Key Files

| File | Purpose |
|------|---------|
| `android/app/src/androidTest/java/com/perkly/app/ScreenshotTest.java` | Instrumentation test — login via JS, navigate via pushState, capture via Screengrab |
| `android/fastlane/Screengrabfile` | Screengrab config (package name, APK paths, output dir) |
| `android/fastlane/Fastfile` | `take_screenshots` lane (build, clear data, screengrab, pull via run-as) |
| `android/app/src/debug/AndroidManifest.xml` | Debug permissions for screengrab |
| `android/scripts/capture-screenshots.sh` | End-to-end orchestration script |

### Test Account

- Email: `xic9967@gmail.com`
- Password: `AsdfJkl;123@`
- This account has credit card data for realistic screenshots.

## Execution

### Prerequisites

- Android emulator running (phone, 7-inch tablet, or 10-inch tablet)
- `adb` accessible at `~/Library/Android/sdk/platform-tools/adb`
- Ruby 3.3.5 via rbenv with `screengrab` gem installed
- Web assets synced: `npm run build:prod && npx cap copy android`

### Available AVDs

- `Medium_Phone_API_36.1` — 1080x2400, 420dpi (phone)
- `Tablet_7inch` — 1200x1920, 213dpi (7-inch tablet)
- `Tablet_10inch` — 1600x2560, 299dpi (10-inch tablet)

### Quick Path: Phone Only

```bash
# With phone emulator already running
cd android
PATH=~/Library/Android/sdk/platform-tools:$PATH \
ANDROID_HOME=~/Library/Android/sdk \
RBENV_VERSION=3.3.5 bundle exec fastlane take_screenshots
```

The `take_screenshots` lane builds debug + test APKs, clears app data, runs screengrab, and pulls screenshots via `run-as` (workaround for Android scoped storage).

### Full Path: All Three Device Sizes

For each device size, the flow is:

1. Start the emulator
2. Wait for boot
3. Install APKs
4. Run the instrumentation test
5. Pull screenshots via `run-as`

```bash
ADB=~/Library/Android/sdk/platform-tools/adb
EMU=~/Library/Android/sdk/emulator/emulator

# For each AVD: Tablet_7inch, Tablet_10inch
$EMU -avd <AVD_NAME> -no-snapshot-load -no-audio -no-boot-anim &
$ADB wait-for-device
$ADB shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 2; done'
sleep 10

$ADB install -r app/build/outputs/apk/debug/app-debug.apk
$ADB install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
sleep 2

$ADB shell am instrument --no-window-animation -w \
  -e class com.perkly.app.ScreenshotTest \
  com.perkly.app.test/androidx.test.runner.AndroidJUnitRunner

# Pull screenshots (note: locale dir may be en-US or en_US)
OUT=fastlane/metadata/android/en-US/images/<deviceDir>  
# deviceDir: phoneScreenshots, sevenInchScreenshots, or tenInchScreenshots
mkdir -p $OUT
LOCALE_DIR=$($ADB shell "run-as com.perkly.app ls app_screengrab/" | tr -d '\r' | head -1)
for f in 01-login 02-dashboard 03-benefits-tracker 04-my-cards 06-perks; do
  $ADB shell "run-as com.perkly.app cat app_screengrab/${LOCALE_DIR}/images/screenshots/${f}.png" > "$OUT/${f}.png"
done

# Kill emulator before starting next
$ADB emu kill
sleep 3
```

### Upload to Play Store

```bash
VERSION_CODE=<current_version_code> RBENV_VERSION=3.3.5 bundle exec fastlane upload_screenshots
```

Requires `android/fastlane/play-store-key.json` (gitignored, copy from main repo if missing).

## Screens Captured

| Screenshot | Screen | Route |
|-----------|--------|-------|
| 01-login | Login/auth page | `/login` |
| 02-dashboard | Dashboard with stats | `/` |
| 03-benefits-tracker | Benefits tracker | `/benefits-tracker` |
| 04-my-cards | Card list | `/cards` |
| 06-perks | Perks list | `/perks` |

## Technical Notes

- **React input handling**: `HTMLInputElement.prototype.value` setter + `dispatchEvent(new Event('input', {bubbles:true}))` is the only way to set React controlled input values from outside the React tree.
- **Route navigation**: `window.history.pushState()` + `PopStateEvent` works for React Router navigation without needing UI interaction.
- **Scoped storage workaround**: Screengrab saves to `app_screengrab/` in internal storage. On modern Android, `adb pull` can't access it. Use `adb shell run-as <pkg> cat <file>` instead.
- **Kotlin conflict**: Root `build.gradle` forces `kotlin-stdlib:1.8.22` to resolve UIAutomator/screengrab dependency conflicts.
- **No `pm clear` inside test**: Clearing app data from `@Before` kills the process. Clear via `adb shell pm clear` before the test run (done in Fastfile lane).

## Outputs

- Screenshots in `android/fastlane/metadata/android/en-US/images/{phoneScreenshots,sevenInchScreenshots,tenInchScreenshots}/`
- Play Store upload confirmation
