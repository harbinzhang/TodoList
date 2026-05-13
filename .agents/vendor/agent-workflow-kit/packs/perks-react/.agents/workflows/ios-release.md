---
description: How to prepare and ship an iOS release for App Store Connect and TestFlight
---

# iOS Release Workflow

## Prerequisites

- Explicit user approval before any App Store Connect upload
- Xcode and CocoaPods/Bundler available locally
- App Store Connect API key or equivalent signing/auth configured
- Root and `ios/` dependencies installed
- Version state already correct, or user has approved changing it
- Default iOS release branch is `native-release`; only use a different release branch when the user explicitly asks for it

## Standard Checks

From the repo root:

1. Confirm you are on the default iOS release branch (`native-release`) unless the user explicitly requested another release branch.

2. Merge from `main`:
```bash
git fetch origin main && git merge origin/main
```

3. Run standard checks:
```bash
npm run version:check
npm run lint
npm run build:prod
```

Recommended before upload:

```bash
npm run test
```

## Common Paths

### 1. Automated TestFlight release via fastlane (default)

This is the preferred path. It prepares the project and uploads to TestFlight in one step without trying to create or edit App Store metadata:

```bash
npm run ios:auto-release
```

This uses `scripts/ios-prepare-archive.sh --upload`, which:

- assumes `native-release` is the default release branch unless the user explicitly chose another branch
- fetches and merges from `origin/main` into the current branch
- runs `node scripts/bump-version.mjs sync`
- runs `npm install`
- runs `npm run ios:sync` (production web build + Capacitor sync)
- runs `cd ios && bundle exec fastlane release` (build + TestFlight upload)

### 2. Full release with App Store metadata

Use this only when the task explicitly includes metadata updates or App Store version preparation:

```bash
npm run appstore:upload
```

This runs `cd ios && bundle exec fastlane release_with_metadata` (build + metadata + TestFlight upload).

### 3. Prepare iOS release branch and sync native project (no upload)

Use the built-in helper when you only need to sync the native project without uploading:

```bash
npm run ios:prepare-archive
```

What it does:

- assumes `native-release` is the default release branch unless the user explicitly chose another branch
- fetches and merges from `origin/main` into the current branch
- runs `node scripts/bump-version.mjs sync`
- runs `npm install`
- runs `npm run ios:sync`

### 4. Manual Xcode archive (alternative)

If the automated path is unavailable or the user specifically requests a manual Xcode archive/upload flow:

```bash
npm run release:ios
```

This builds the web app, syncs Capacitor iOS, and opens the Xcode project. The user then archives and uploads manually through Xcode.

### 5. Upload individual release components

When a task only covers metadata, screenshots, or an IPA upload:

```bash
npm run appstore:metadata
npm run appstore:screenshots
npm run appstore:testflight
npm run appstore:upload
```

Fastlane lanes live in `ios/fastlane/Fastfile`.

## CI Path

There is no active GitHub Actions iOS deploy workflow in this repo right now.

Use the local fastlane path when the user asks for an iOS build or TestFlight upload.

## Verification

- Confirm `npm run version:check` passes after any version changes
- Confirm `ios/App/App.xcodeproj/project.pbxproj` reflects the intended marketing version and build number
- If uploading, confirm the build appears in App Store Connect / TestFlight
- Report whether distribution is internal only or intended for external testers
