---
name: marketing-recordings
description: Capture, regenerate, verify, and promote Perkmon marketing screenshots and user-journey videos from staging or approved synthetic demo scenes. Use when the user asks to record FAQ journeys, refresh real-app marketing videos, regenerate Batch Add clips, capture product screenshots for marketing, or update assets under docs/assets/marketing-recordings or docs/assets/marketing-screenshots.
---

# Marketing Recordings

## Overview

Use this skill for Perkmon marketing assets that need to look like a real product account: FAQ journey videos, Batch Add recordings, feature screenshots, and staged clips for the marketing website.

The canonical procedure is `.agents/workflows/marketing-recordings.md`. Load that workflow before running recording scripts or promoting generated assets.

## When To Use

Use this skill when the request mentions:

- recording or re-recording FAQ/user journey videos
- real app marketing recordings from staging
- Batch Add demo clips such as `01-add-cards-batch-real.mp4`
- click, ripple, cursor, tap, or pacing fixes in marketing videos
- promoting generated videos or screenshots into `docs/assets/marketing-recordings/`
- marketing screenshots in `docs/assets/marketing-screenshots/`

Use app store screenshot skills instead when the request is specifically about App Store or Google Play store listing screenshots.

## Safety Rules

- Real-app recordings must target staging unless the user explicitly asks otherwise. Never write staging-recorder data to production.
- Use the dedicated marketing recorder account and env keys from `docs/operations/marketing-recording.md`; do not use the normal E2E fixture user.
- Do not commit `.env.staging.local`, auth-state files, temporary browser video directories, passwords, emails, tokens, or raw debug dumps that expose account state.
- Keep real-app and synthetic assets clearly separated. Do not present synthetic scenes as real app recordings.
- Record into `/tmp` or another scratch directory first. Promote into repo assets only after validation passes.
- The real Batch Add journey creates staging `userCards`. State this in the report and avoid broad cleanup unless the user asks for it.
- Do not use `--ask-ai-send` or `--submit-feedback` unless the user explicitly wants those staging writes.

## Execution Flow

1. Open `.agents/workflows/marketing-recordings.md`.
2. Classify the target asset: real-app FAQ video, one real-app journey, synthetic FAQ scene, standalone Batch Add recording, or screenshot set.
3. Confirm the target output directory and whether the user wants a replacement promoted into the repo.
4. Run the workflow's prerequisite checks for recorder credentials and ffmpeg.
5. Generate into a scratch directory.
6. Validate the manifest, duration, warnings, screenshots, and visual pacing.
7. Promote only clean selected outputs into the repo asset directory.
8. Report exact paths, command, duration, warning status, and any staging writes.

## Quality Bar

The final asset should be readable at marketing-site sizes, not just technically recorded:

- no empty-state demo unless the feature is intentionally about onboarding
- no real names, emails, card numbers, bank credentials, or private account data
- realistic account data density without visual clutter
- first screen has about 1-2 seconds for the viewer to understand context
- no long dead time before interaction starts
- click ripple appears before the click and does not double-fire
- final frame lands on an intentional completed state, not a spinner or transient modal
- MP4 output is available for website use unless the user requested raw WebM only
