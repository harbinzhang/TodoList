---
description: How to prepare and ship an iOS release for App Store Connect and TestFlight
---

# iOS Release Workflow

## Prerequisites

- Explicit user approval before any App Store Connect upload
- Xcode and CocoaPods/Bundler available locally
- App Store Connect API key or equivalent signing/auth configured
- Root and `ios/` dependencies installed
- `ios/App/App/GoogleService-Info.plist` and
  `ios/App/Pods/FirebaseCrashlytics/upload-symbols` present
- Version state already correct, or user has approved changing it
- Default iOS release branch is `native-release`; only use a different release branch when the user explicitly asks for it

## Standard Checks

From the repo root:

1. Confirm you are on the default iOS release branch (`native-release`) unless the user explicitly requested another release branch.

2. Ensure ignored local native release inputs are present:
```bash
npm run native:bootstrap:ios
npm run native:preflight:ios
```

`native:bootstrap:ios` copies from `$PERKMON_RELEASE_CONFIG_DIR` when set, otherwise from `~/Library/Mobile Documents/com~apple~CloudDocs/Project/perkmon`. It only copies gitignored local release inputs. `native:preflight:ios` must pass before syncing, building, or uploading an iOS release.

3. Merge from `main`:
```bash
git fetch origin main && git merge origin/main
```

4. Run standard checks:
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
- runs `cd ios && bundle exec fastlane release`, which:
  - builds the archive and IPA
  - verifies the generated dSYM contains at least one UUID
  - preserves the symbol artifact under `ios/build/dsyms/<version>-<build>/`
  - explicitly uploads the preserved dSYM to Crashlytics and fails before the
    TestFlight upload if symbol validation or upload fails
  - uploads the IPA to TestFlight

### 2. Full release with App Store metadata

Use this only when the task explicitly includes metadata updates or App Store version preparation:

```bash
npm run appstore:upload
```

This runs `cd ios && bundle exec fastlane release_with_metadata` (build + metadata + TestFlight upload).

### 3. Public App Store review release

Use this when the task is public distribution / App Store review, not just
internal TestFlight. It wraps the TestFlight upload, waits for App Store Connect
to expose the processed build, submits the selected build for review without
changing the existing listing metadata, and treats `WAITING_FOR_REVIEW` /
`IN_REVIEW` as the successful terminal status:

```bash
npm run ios:public-release -- --yes
```

When the build number must be advanced first, use the cross-platform version
pipeline and commit the release metadata before upload:

```bash
npm run ios:public-release -- --yes --bump-build --commit-version
```

For a build that was already uploaded but not yet selectable, retry only the
review submission/polling step:

```bash
npm run ios:public-release -- --yes --skip-upload
```

The script requires explicit `--yes` (or `IOS_PUBLIC_RELEASE_APPROVED=true`) for
real App Store Connect actions. Use `--dry-run` to inspect commands without
uploading or submitting.

### 4. Prepare iOS release branch and sync native project (no upload)

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

### 5. Manual Xcode archive (alternative)

If the automated path is unavailable or the user specifically requests a manual Xcode archive/upload flow:

```bash
npm run release:ios
```

This builds the web app, syncs Capacitor iOS, and opens the Xcode project. The user then archives and uploads manually through Xcode.

### 6. Upload individual release components

When a task only covers metadata, screenshots, or an IPA upload:

```bash
npm run appstore:metadata
npm run appstore:screenshots
DSYM_PATH=/absolute/path/to/App.app.dSYM.zip npm run appstore:testflight
npm run appstore:upload
```

`appstore:testflight` requires the matching dSYM through `DSYM_PATH` when it
does not run immediately after the Fastlane build lane. This prevents an
existing IPA from being uploaded without its symbols.

Fastlane lanes live in `ios/fastlane/Fastfile`.

## dSYM guarantees and missing-symbol recovery

The Xcode target keeps `Crashlytics Upload Symbols` as its last build phase for
manual Xcode archives. The Fastlane release path additionally performs an
explicit, fail-fast upload before uploading the IPA. Duplicate Crashlytics
symbol uploads are safe.

After every Fastlane build, retain:

```text
ios/build/dsyms/<version>-<build>/
```

When Firebase reports a missing UUID:

1. Locate the matching `.dSYM`, `.dSYM.zip`, or `.xcarchive/dSYMs` directory.
2. Verify and upload the exact UUID:

```bash
npm run appstore:dsym:upload -- \
  --dsym /absolute/path/to/App.xcarchive/dSYMs \
  --expected-uuid <UUID-FROM-FIREBASE> \
  --version <MARKETING_VERSION> \
  --build-number <CURRENT_PROJECT_VERSION>
```

The command exits nonzero if the artifact is absent, contains no UUIDs, does
not contain the expected UUID, lacks the Firebase config/upload tool, or if
Crashlytics rejects the upload. Use `--skip-upload` to validate and preserve an
artifact without contacting Firebase.

If the archive is unavailable locally, use Xcode Organizer to locate the
original `.xcarchive`. Do not upload a dSYM from another build: matching the
marketing version is insufficient; the UUID must match the Firebase alert.

## CI Path

There is no active GitHub Actions iOS deploy workflow in this repo right now.

Use the local fastlane path when the user asks for an iOS build or TestFlight upload.

## Verification

- Confirm `npm run version:check` passes after any version changes
- Confirm `ios/App/App.xcodeproj/project.pbxproj` reflects the intended marketing version and build number
- Confirm Fastlane reports the generated dSYM UUIDs and the preserved
  `ios/build/dsyms/<version>-<build>/` artifact
- Confirm the explicit Crashlytics dSYM upload succeeds before the IPA upload
- If uploading, confirm the build appears in App Store Connect / TestFlight
- Report whether distribution is internal only or intended for external testers
