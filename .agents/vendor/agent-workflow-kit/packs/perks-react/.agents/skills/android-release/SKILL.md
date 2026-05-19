---
name: android-release
description: Prepare and ship an Android release to Google Play via CI or local build
---

# Android Release Skill

Canonical workflow doc: `.agents/workflows/android-release.md`

Use this skill when the user asks to build, deploy, or promote an Android release for Google Play.

## Safety

- Explicit user approval required before any Play Store upload or track promotion.
- Check `.agents/conventions.md` for production safety rules before proceeding.
- Hard stop policy: if any pre-deploy check fails (lint, build, test, version mismatch), do not proceed with build or upload. Report blockers and wait for user direction.
- Signing credentials live in GitHub Secrets — do not attempt local signing unless the user confirms local credentials are available.

## Execution

1. Load `.agents/workflows/android-release.md`.
2. Run standard checks: version sync, lint, build, test.
3. Sync web build into Android project via `npm run android:sync`.
4. Choose the build path based on user intent:
   - **CI path (default)**: trigger GitHub Actions via `gh workflow run` or branch push.
   - **Local path**: only if user confirms local keystore and credentials.
5. For CI path, determine dispatch options:
   - `skip_upload`: build only, no Play Store upload
   - `promote_to_open`: also promote to open testing
   - `release_notes_override` / `release_notes_context`: custom release notes
6. Monitor the workflow run and report results.
7. If uploading, confirm the release reached the intended Play track.

## Outputs

- Build path used (CI or local)
- Pre-deploy check results
- Version and build number status
- Workflow run URL and status (if CI)
- Play Store track confirmation (if uploaded)
