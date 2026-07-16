---
name: android-release
description: Prepare and ship an Android release to Google Play via local fastlane build/upload
---

# Android Release Skill

Canonical workflow doc: `.agents/workflows/android-release.md`

Use this skill when the user asks to build, deploy, or promote an Android release for Google Play.

## Safety

- Explicit user approval required before any Play Store upload or track promotion.
- Check `.agents/conventions.md` for production safety rules before proceeding.
- Hard stop policy: if any pre-deploy check fails (lint, build, test, version mismatch), do not proceed with build or upload. Report blockers and wait for user direction.
- Do not attempt local signing or Play upload unless the required local credentials are available.
- If a release worktree is missing config, env, or key files, check the primary local release checkout first before recreating anything. Use the locally configured path, such as `$PRIMARY_RELEASE_CHECKOUT`.

## Execution

1. Load `.agents/workflows/android-release.md`.
2. Check Play Store version codes first, then run `npm run android:prepare-release` so local `release/version.json` / Android `versionCode` becomes greater than Play's max build code.
3. Run standard checks: `npm run version:check`, lint, production build, and tests.
4. Run the Fastlane `validate_version_code` gate immediately before build/upload; hard stop if local `VERSION_CODE` is not strictly greater than every Play track.
5. Sync web build into Android project via `npm run android:sync`.
6. Use the local release path by default:
   - Prepare version/build state and tag discipline per the workflow doc.
   - Build/upload/promote through the existing Android fastlane lanes.
   - Use a CI path only if an active Android release workflow exists and the user asks for it.
7. If required local release inputs are missing in the current worktree, look in the primary local release checkout for existing config, env, and key files before treating them as absent.
8. Report the local commands used and their results.
9. If uploading or promoting, confirm the release reached the intended Play track (`alpha` for closed testing, `beta` for open testing, `production` for production).

## Outputs

- Build path used (local fastlane)
- Pre-deploy check results
- Version and build number status
- Missing local release inputs, if any
- Play Store track confirmation (if uploaded)
