---
description: How to prepare and ship an Android release for Google Play
---

# Android Release Workflow

## Prerequisites

- Explicit user approval before any Play Store upload or track promotion
- Version state already correct, or user has approved changing it
- The release commit has already been tagged as `v<package.json version>` before any CI upload
- Default mobile release branch is `native-release`; only use a different branch if the user explicitly asks for it

## Standard Checks

From the repo root:

1. Sync versions across all native projects:
```bash
npm run android:prepare-release
node scripts/bump-version.mjs sync
npm run version:check
```

`npm run android:prepare-release` is the preferred pre-tag step. When Play credentials are available, it reads the highest versionCode already present on Play and bumps `release/version.json` to the next safe value before running `version:check`. Without credentials, it falls back to a local increment.

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

Use the local/manual release path when the user explicitly wants an Android build or Play upload. That path requires local signing and Play credentials.

## Local Build (Requires Local Credentials)

### Requirements

- `android/app/perkly-release.keystore` — signing keystore file
- Environment variables: `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
- `android/fastlane/play-store-key.json` — Google Play service account key (for upload)
- Ruby 3.3.5 via rbenv (not system Ruby): `RBENV_VERSION=3.3.5 bundle install`

### Build

```bash
cd android && RBENV_VERSION=3.3.5 bundle exec fastlane build
```

Expected artifact: `android/app/build/outputs/bundle/release/app-release.aab`

### Upload / Promote

```bash
cd android && RBENV_VERSION=3.3.5 bundle exec fastlane deploy_internal
cd android && RBENV_VERSION=3.3.5 bundle exec fastlane promote_to_open
cd android && RBENV_VERSION=3.3.5 bundle exec fastlane promote_to_production
```

Fastlane lanes are defined in `android/fastlane/Fastfile`.

Tag discipline still matters for release bookkeeping:

- Real uploads should correspond to a release tag in the form `vX.Y.Z`
- Branch-only Android builds are development verification, not the release source of truth
- Any Android-only fixes should be merged before the release tag is created

## Verification

- Confirm `npm run version:check` passes after any version changes
- Confirm the selected release tag matches `package.json` version before upload
- Confirm `android/app/build.gradle` reflects the intended `versionName` and `versionCode`
- If uploading, confirm the release reached the intended Play track in the Google Play Console
