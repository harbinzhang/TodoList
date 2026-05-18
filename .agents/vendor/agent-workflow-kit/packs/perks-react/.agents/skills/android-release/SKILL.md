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
2. Run standard checks: version sync, lint, build, test.
3. Sync web build into Android project via `npm run android:sync`.
4. Use the local release path by default:
   - Prepare version/build state and tag discipline per the workflow doc.
   - Build/upload/promote through the existing Android fastlane lanes.
5. If required local release inputs are missing in the current worktree, look in the primary local release checkout for existing config, env, and key files before treating them as absent.
6. Report the local commands used and their results.
7. If uploading, confirm the release reached the intended Play track.

## Outputs

- Build path used (local fastlane)
- Pre-deploy check results
- Version and build number status
- Missing local release inputs, if any
- Play Store track confirmation (if uploaded)
