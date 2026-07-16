---
description: How to prepare and ship an Android release for Google Play
---

# Android Release Workflow

## Prerequisites

- Explicit user approval before any Play Store upload or track promotion
- Version state already correct, or user has approved changing it
- The release commit should be tagged as `v<package.json version>` before the final upload/promotion step
- Default mobile release branch is `native-release`; only use a different branch if the user explicitly asks for it
- If this release worktree is missing config, env, or key files, check the primary local release checkout first for existing local release inputs before recreating anything. Use the locally configured path, such as `$PRIMARY_RELEASE_CHECKOUT`.

## Standard Checks

From the repo root:

0. Ensure ignored local native release inputs are present:
```bash
npm run native:bootstrap:android
npm run native:preflight:android
```

`native:bootstrap:android` copies from `$PERKMON_RELEASE_CONFIG_DIR` when set, otherwise from `~/Library/Mobile Documents/com~apple~CloudDocs/Project/perkmon`. It only copies gitignored local release inputs. `native:preflight:android` must pass before syncing, building, or uploading an Android release.

1. Check Play Store version codes and prepare the next safe local build number:
```bash
PATH="$HOME/.rbenv/shims:$PATH" RBENV_VERSION=3.3.5 npm run android:prepare-release
npm run version:check
```

`npm run android:prepare-release` is the required first release step. When Play credentials are available, it runs Fastlane's `print_next_version_code`, reads the highest `versionCode` already present across Play tracks, and syncs `release/version.json` / native project files to the next safe value. The local `buildNumber` / Android `versionCode` must be greater than Play's max before any upload.

Hard stop before upload if Play version codes could not be read. The script may fall back to a local increment for offline preparation, but a real Play upload must use a Play-derived build number, not a guess.

If you need to inspect Play without changing files:

```bash
(cd android && RBENV_VERSION=3.3.5 rbenv exec bundle exec fastlane print_next_version_code)
```

If the current local build number is not greater than `PLAY_STORE_MAX_VERSION_CODE`, go back to the repo root and re-run `android:prepare-release`. Do not continue with build or upload from stale local version state.

2. Run standard checks:
```bash
npm run lint
npm run build:prod
npm run test
```

## Prepare Native Project

Sync the web build into the Android project:

```bash
npm run android:sync
```

If the user only wants Android Studio opened for manual work:

```bash
npm run android:open
```

## Build Path

There is no active GitHub Actions Android release workflow in this repo right now.

Use the local/manual release path when the user explicitly wants an Android build or Play upload. That path requires local signing and Play credentials and should prefer existing repo-local assets over newly generated replacements.

## Find Missing Local Inputs

When the current release worktree is missing required local inputs, check the primary local release checkout first. Use the locally configured path, such as `$PRIMARY_RELEASE_CHECKOUT` or `<primary-release-checkout>`.

Common files to look for there:

- `android/app/perkly-release.keystore`
- `android/fastlane/play-store-key.json`
- root `.env.production`
- `android/local.properties` if the local Android SDK path is not configured in the current worktree

Rules:

- Copy or reference only what is needed for the current local release flow
- Do not commit copied secrets or machine-local config
- If the primary local checkout is also missing the file, stop and report the blocker rather than inventing replacement credentials

## Local Build (Requires Local Credentials)

### Requirements

- `android/app/perkly-release.keystore` — signing keystore file
- Environment variables: `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
- `android/fastlane/play-store-key.json` — Google Play service account key (for upload)
- Root production env/config required by the app build, typically from `.env.production`
- `android/app/google-services.json` — Firebase Android config; release builds fail if this is missing or empty
- Ruby 3.3.5 via rbenv (not system Ruby): `(cd android && RBENV_VERSION=3.3.5 rbenv exec bundle install)`

### Build

Before building, run the upload gate from the repo root:

```bash
export VERSION_CODE="$(node -p "require('./release/version.json').buildNumber")"
export VERSION_NAME="$(node -p "require('./package.json').version")"
(cd android && RBENV_VERSION=3.3.5 rbenv exec bundle exec fastlane validate_version_code)
```

This must pass immediately before any Play upload. It re-checks Play's current max `versionCode` and confirms the local `VERSION_CODE` is strictly greater.

Then build the release AAB:

```bash
(cd android && RBENV_VERSION=3.3.5 rbenv exec bundle exec fastlane build)
```

Expected artifact: `android/app/build/outputs/bundle/release/app-release.aab`

### Upload / Promote

```bash
(cd android && RBENV_VERSION=3.3.5 rbenv exec bundle exec fastlane deploy_internal)
(cd android && RBENV_VERSION=3.3.5 rbenv exec bundle exec fastlane promote_to_open)
(cd android && RBENV_VERSION=3.3.5 rbenv exec bundle exec fastlane promote_to_production)
```

Fastlane lanes are defined in `android/fastlane/Fastfile`.

Google Play track mapping:

- Internal testing: `internal`, Fastlane lane `deploy_internal`
- Closed testing: `alpha`, use `upload_to_play_store track:internal track_promote_to:alpha ...` unless a dedicated lane exists
- Open testing: `beta`, Fastlane lane `promote_to_open`
- Production: `production`, Fastlane lane `promote_to_production`

Tag discipline still matters for release bookkeeping:

- Real uploads should correspond to a release tag in the form `vX.Y.Z`
- Branch-only Android builds are development verification, not the release source of truth
- Any Android-only fixes should be merged before the release tag is created

## Verification

- Confirm `npm run version:check` passes after any version changes
- Confirm Fastlane `print_next_version_code` was run with Play credentials before version sync
- Confirm Fastlane `validate_version_code` passes immediately before build/upload
- Confirm the selected release tag matches `package.json` version before upload
- Confirm `android/app/build.gradle` reflects the intended `versionName` and `versionCode`
- Confirm any missing local inputs were sourced from the primary local release checkout or reported as blockers
- If uploading, confirm the release reached the intended Play track in the Google Play Console
