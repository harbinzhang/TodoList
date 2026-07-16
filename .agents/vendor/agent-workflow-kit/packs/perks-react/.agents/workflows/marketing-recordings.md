---
description: Record, verify, and promote Perkmon marketing screenshots and journey videos from staging or approved synthetic demo scenes
---

# Marketing Recordings

Use this workflow for Perkmon marketing website assets: real-app FAQ journey videos, Batch Add clips, product screenshots, and synthetic demo fallbacks stored under `docs/assets/`.

The deeper user-facing runbook is `docs/operations/marketing-recording.md`. This workflow is the agent execution checklist.

For prioritized feature clips and follow-up prompts, use `docs/TODO/marketing-feature-recording-backlog.md`.

## Asset Locations

| Asset type | Script or source | Promoted directory |
|---|---|---|
| Real-app FAQ journey videos | `scripts/marketing-record-real-faq-journeys.mjs` | `docs/assets/marketing-recordings/real-app-faq-journeys/` |
| Synthetic FAQ journey videos | `scripts/marketing-record-faq-journeys.mjs` | `docs/assets/marketing-recordings/faq-journeys/` |
| Standalone Batch Add recording | `scripts/marketing-record-batch-add.mjs` | `docs/assets/marketing-recordings/batch-add/<label>/` |
| Marketing screenshots | script-generated or manual verified captures | `docs/assets/marketing-screenshots/` |

## Prerequisites

- Staging target defaults to `https://perkmon-staging.web.app`.
- `.env.staging` points to the staging Firebase project.
- `.env.staging.local` provides:

```bash
MARKETING_RECORDING_EMAIL=...
MARKETING_RECORDING_PASSWORD=...
MARKETING_RECORDING_APP_CHECK_DEBUG_TOKEN=...
```

- Playwright Chromium is installed:

```bash
npx playwright install chromium
```

- `ffmpeg` is available on `PATH`, or use the local static binary helper:

```bash
mkdir -p /tmp/perkmon-ffmpeg-static
npm --prefix /tmp/perkmon-ffmpeg-static install ffmpeg-static@5.3.0 --no-audit --no-fund
FFMPEG_BIN="$(node -e "console.log(require('/tmp/perkmon-ffmpeg-static/node_modules/ffmpeg-static'))")"
```

## Real-App FAQ Recordings

Record all real-app FAQ journeys to a scratch directory:

```bash
node scripts/marketing-record-real-faq-journeys.mjs \
  --out-dir /tmp/perkmon-real-app-faq-rerecord \
  --ffmpeg-path "$FFMPEG_BIN"
```

Promote clean outputs into the repo asset set:

```bash
node scripts/marketing-record-real-faq-journeys.mjs \
  --out-dir /tmp/perkmon-real-app-faq-rerecord \
  --promote-to docs/assets/marketing-recordings/real-app-faq-journeys \
  --ffmpeg-path "$FFMPEG_BIN"
```

Record and promote only the Batch Add FAQ journey:

```bash
node scripts/marketing-record-real-faq-journeys.mjs \
  --only 01-add-cards-batch-real \
  --out-dir /tmp/perkmon-real-app-faq-rerecord \
  --promote-to docs/assets/marketing-recordings/real-app-faq-journeys \
  --ffmpeg-path "$FFMPEG_BIN"
```

Record the richer Batch Add input used for marketing:

```bash
MARKETING_CARDS=$'CSR
amex plat *4
amex gold

hyatt globalist'

node scripts/marketing-record-real-faq-journeys.mjs \
  --only 01-add-cards-batch-real \
  --out-dir /tmp/perkmon-real-app-faq-rerecord \
  --promote-to docs/assets/marketing-recordings/real-app-faq-journeys \
  --ffmpeg-path "$FFMPEG_BIN" \
  --cards "$MARKETING_CARDS"
```

Expected result for that input:

```text
Review Cards: 7 cards found
All Done: 7 cards added
```

### Launch-Set Recording

Use the launch-set catalog when the user asks for the FAQ/manual driven first batch:

```bash
node scripts/marketing-record-real-faq-journeys.mjs \
  --first-launch \
  --out-dir /tmp/perkmon-video-launch-set \
  --ffmpeg-path "$FFMPEG_BIN"
```

The run writes:

- `manifest.json` for recorder evidence
- `perkmon-dot-com-handoff.json` for later website publishing
- per-journey website MP4, poster PNG, clean 1080x1920 social MP4, screenshots, and 4fps contact sheet

Do not promote any launch-set output if `manifest.records[*].warnings` is non-empty or if a click-first record lacks valid `clicks[]` evidence.

## Synthetic FAQ Recordings

Use synthetic scenes only for features that do not exist yet, feature-gap placeholders, or intentionally fake marketing screenshots.

```bash
node scripts/marketing-record-faq-journeys.mjs --only 03-ask-ai-trip-advice
```

Keep the distinction clear in the report and in docs. Do not mix synthetic assets into the real-app journey directory.

## Standalone Batch Add Recording

Use the standalone recorder when the user asks for a community/demo Batch Add video rather than the full FAQ journey set:

```bash
node scripts/marketing-record-batch-add.mjs \
  --label=2026-05-10-ux \
  --out-dir=/tmp/perkmon-marketing/batch-add-demo \
  --ffmpeg-path="$FFMPEG_BIN"
```

Promoted standalone Batch Add assets should land under:

```text
docs/assets/marketing-recordings/batch-add/<label>/
```

## Visual Timing Rules

Use these checks before replacing an approved video:

- Start recording close to the relevant screen, usually after navigation into the feature.
- Leave about 1-2 seconds on the initial screen so the viewer can read it.
- Avoid the first 5-10 seconds being idle or just page setup.
- The click ripple should appear before the real click and should not double-fire.
- End on a stable completed state such as `All Done: 7 cards added`, not `Adding Cards...`.
- Keep phone journey MP4s under about 30 seconds unless the user asks for a longer walkthrough.

## Validation

Check the manifest for warnings and expected record metadata:

```bash
node -e "
const m = require('./docs/assets/marketing-recordings/real-app-faq-journeys/manifest.json')
const r = m.records.find((item) => item.slug === '01-add-cards-batch-real')
console.log({
  slug: r?.slug,
  durationMs: r?.durationMs,
  warnings: r?.warnings,
  writeBehavior: r?.writeBehavior,
  mp4: r?.outputs?.mp4
})
"
```

Inspect video metadata:

```bash
"$FFMPEG_BIN" -i docs/assets/marketing-recordings/real-app-faq-journeys/01-add-cards-batch-real/01-add-cards-batch-real.mp4 2>&1 | rg "Duration|Video"
```

Generate a contact sheet when timing or click animation is in question:

```bash
"$FFMPEG_BIN" -y \
  -ss 00:00:01 \
  -i docs/assets/marketing-recordings/real-app-faq-journeys/01-add-cards-batch-real/01-add-cards-batch-real.mp4 \
  -vf "fps=2,scale=195:422,tile=5x5" \
  /tmp/perkmon-real-app-faq-rerecord-contact.png
```

Acceptance criteria:

- manifest has no warnings for promoted records
- MP4 exists and opens
- duration and viewport match the intended website placement
- screenshots or contact sheet confirm the first frame, click pacing, and final state
- no secrets, emails, card numbers, or bank credentials appear
- any staging write behavior is stated explicitly in the report

## Cleanup

- Recorder auth-state files under `e2e/.auth/marketing.*.json` are temporary and must not be committed.
- Scratch output under `/tmp/perkmon-*` may remain for local inspection, but do not report it as the canonical asset.
- The real Batch Add flow intentionally writes staging `userCards` to the marketing recorder account. Do not delete them unless the user asks for cleanup.
- If cleanup is requested, use the Firestore workflow and restrict cleanup to the dedicated marketing recorder user.

## Report Format

Report:

- asset type and journey slug
- target URL and recorder account type, without secrets
- exact command run
- output MP4/WebM/screenshot paths
- duration and warning status
- whether the asset was promoted
- staging writes performed or avoided
- any remaining manual visual QA needed
