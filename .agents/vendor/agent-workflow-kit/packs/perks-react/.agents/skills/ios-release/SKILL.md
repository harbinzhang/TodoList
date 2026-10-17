---
name: ios-release
description: Build and upload iOS app to App Store Connect / TestFlight. Use this skill whenever the user mentions uploading to TestFlight, App Store Connect, iOS release, fastlane upload, building an IPA, or running any ios/fastlane command. Also triggers for "upload to app connect", "submit iOS build", "ios:auto-release", or "appstore:" npm scripts. This skill ensures correct version syncing across all platforms before any upload — skipping it risks version drift between iOS, Android, and web.
---

# iOS Release Skill

Canonical workflow doc: `.agents/workflows/ios-release.md`

Use this skill when the user asks to build, upload, or release an iOS app to App Store Connect or TestFlight. This includes full releases, TestFlight uploads, metadata updates, and screenshot uploads.

## Why this skill exists

Uploading an iOS build involves multiple platforms (web, iOS, Android) sharing a single version source of truth. Manually bumping the iOS build number (e.g. via `agvtool`) without going through the project's version sync system causes version drift — the iOS build number diverges from `release/version.json`, `package.json`, and Android's `build.gradle`. A successful IPA upload without its matching dSYM also leaves Crashlytics unable to symbolicate production crashes. This skill ensures every iOS release follows the correct version management and symbol-upload pipeline.

## Safety

- **Production uploads require explicit user approval** before any App Store Connect upload command runs.
- Check `.agents/conventions.md` for production safety rules before proceeding.
- Never use `agvtool` directly to change build numbers. Always use `node scripts/bump-version.mjs` to keep all platforms in sync.
- If any pre-upload check fails (version mismatch, lint error, build failure,
  missing/mismatched dSYM, or Crashlytics symbol-upload failure), stop and
  report the issue before proceeding.
- The `release` lane automatically checks App Store Connect for versions in review (`WAITING_FOR_REVIEW` / `IN_REVIEW`). If one is found, the release aborts. Cancel the existing review or wait for it to complete before retrying.

## Execution

### Step 1: Verify prerequisites

Before doing anything, confirm:
- User has explicitly approved the upload
- The working tree is on `native-release` by default; only use another release branch if the user explicitly requests it
- App Store Connect API key is configured (check `ios/fastlane/.env`)

### Step 2: Choose the release path

Default to the automated fastlane path unless the user explicitly requests otherwise:

| Path | Command | When to use |
|------|---------|-------------|
| **Automated TestFlight release (default)** | `npm run ios:auto-release` | Fresh build + TestFlight upload in one step without touching App Store metadata |
| **Public App Store review release** | `npm run ios:public-release -- --yes` | Fresh build + TestFlight upload + automatic build-processing retry + App Store review submission without changing listing metadata |
| **Full automated release with metadata** | `npm run appstore:upload` | Use only when the task explicitly includes App Store metadata or version-page updates |
| **Upload existing IPA** | `DSYM_PATH=/absolute/path/to/App.app.dSYM.zip npm run appstore:testflight` | IPA and its matching dSYM already exist |
| **Metadata only** | `npm run appstore:metadata` | Update App Store listing text |
| **Screenshots only** | `npm run appstore:screenshots` | Update App Store screenshots |
| **Manual Xcode archive (alternative)** | `npm run ios:prepare-archive` then open Xcode | User specifically wants to archive/upload manually via Xcode |

### Step 3: Version management (critical)

Before building or uploading, ensure versions are synced:

```bash
# Sync versions across all platforms (web, iOS, Android)
node scripts/bump-version.mjs sync

# Verify all platforms match
npm run version:check
```

If the build number needs to increment (e.g. App Store Connect rejects a duplicate):

```bash
# Increment build number across ALL platforms
node scripts/bump-version.mjs sync --bump-build

# Or set a specific build number
node scripts/bump-version.mjs sync --build-number=<N>
```

**Never** use `agvtool new-version` or manually edit `project.pbxproj` — these only touch iOS and leave other platforms out of sync.

### Step 4: Pre-upload checks

Run from the repo root:

```bash
# Default branch for iOS releases is native-release
git fetch origin main && git merge origin/main
npm run version:check
npm run lint
npm run build:prod
```

### Step 5: Execute the chosen path

For the most common case (default TestFlight upload):

```bash
npm run ios:auto-release
```

This runs `scripts/ios-prepare-archive.sh --upload`, which:
1. Uses `native-release` as the default iOS release branch unless the user explicitly chose another branch
2. Fetches and merges `origin/main`
3. Runs `bump-version.mjs sync`
4. Runs `npm install`
5. Runs `npm run ios:sync` (production web build + Capacitor sync)
6. Runs `cd ios && bundle exec fastlane release` (build + dSYM
   validation/preservation/Crashlytics upload + TestFlight upload)

For the full metadata + upload path:

```bash
npm run appstore:upload
```

This runs `cd ios && bundle exec fastlane release_with_metadata` (build + metadata + TestFlight upload).

For public distribution / App Store review:

```bash
npm run ios:public-release -- --yes
```

This wraps the TestFlight upload, retries `submit_review` while App Store
Connect is still processing the new build, and verifies that the version reaches
`WAITING_FOR_REVIEW` / `IN_REVIEW`. If a new build number is required before the
release, use:

```bash
npm run ios:public-release -- --yes --bump-build --commit-version
```

For upload-only (IPA already exists):

```bash
DSYM_PATH=/absolute/path/to/App.app.dSYM.zip npm run appstore:testflight
```

The dSYM must come from the same archive as the IPA. The lane fails before
uploading the IPA if the symbols are missing, invalid, or rejected by
Crashlytics.

### Step 6: Handle upload errors

Common errors and correct fixes:

| Error | Wrong fix | Correct fix |
|-------|-----------|-------------|
| "bundle version already used" | `agvtool new-version` | `node scripts/bump-version.mjs sync --bump-build` then rebuild |
| Version mismatch | Edit `project.pbxproj` manually | `node scripts/bump-version.mjs sync` |
| Firebase "Missing dSYM" | Upload any dSYM with the same version | Locate the original archive and run `npm run appstore:dsym:upload -- --dsym <path> --expected-uuid <uuid> --version <version> --build-number <build>` |

After fixing, re-run `npm run version:check` before retrying the upload.

For a missing-symbol alert, the recovery command validates the UUID before it
contacts Firebase. `--skip-upload` performs local validation and preserves the
artifact without uploading it.

### Step 7: Verification

- `npm run version:check` passes
- `ios/App/App.xcodeproj/project.pbxproj` shows the correct MARKETING_VERSION and CURRENT_PROJECT_VERSION
- Fastlane prints the generated dSYM UUIDs
- The matching symbol artifact exists under
  `ios/build/dsyms/<version>-<build>/`
- Crashlytics symbol upload succeeds before the IPA is sent to TestFlight
- Build appears in App Store Connect / TestFlight (may take a few minutes)
- Report whether distribution is internal only or intended for external testers

## Outputs

- Release path chosen and why
- Version sync status (all platforms)
- Pre-upload check results
- dSYM UUIDs, preserved artifact path, and Crashlytics upload result
- Commands executed
- Upload result and App Store Connect status
- Any follow-up actions needed
