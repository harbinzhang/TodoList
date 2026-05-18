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
- Confirm any missing local inputs were sourced from the primary local release checkout or reported as blockers
- If uploading, confirm the release reached the intended Play track in the Google Play Console
