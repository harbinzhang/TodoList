---
name: android-release
description: Prepare and ship one exact tagged Android source through the locked local runner, verify Open testing availability, safely resume Production review submission, and keep Production publishing manual by default
---

# Android Release Skill

Canonical workflow: `.agents/workflows/android-release.md`

Use this skill when the user asks to prepare, build, upload, promote, or verify
an Android release for Google Play.

## Safety

- Read `.agents/conventions.md` and the canonical workflow before acting.
- Require explicit user approval before any Play upload or promotion.
- Default production releases to `--rollout=manual`; this creates a Play
  production draft and promotes that exact build to Open testing as
  `completed`. Managed publishing must be confirmed OFF so Open testing
  publishes automatically after approval. It does not start production
  rollout. Use completed production rollout only when explicitly requested.
- Managed publishing is app-wide, not track-specific. After Open testing is
  published, confirm it is ON before submitting the production draft for
  review, so approved production changes remain waiting for manual publish.
- Treat the release as phased. A successful runner ends at
  `OPEN_TESTING_SUBMITTED`; it is not proof that Open testing is live, that
  Production is in review, or that Production is published.
- When resuming an existing release, never rerun the production runner or
  re-upload an AAB if the exact version/build is already present. Follow the
  workflow's Production review continuation procedure.
- Before submitting Production for review, inspect every pending change in
  Publishing overview. Require exactly the expected Production version and
  `Start full rollout` change; any additional or mismatched change is a hard
  stop.
- Never manually publish the production change after approval without explicit
  production rollout approval and an exact review of all ready changes.
- Use the single `android:production-release` runner for production. Do not
  split one release across independent agent tasks or manually repeat
  preparation/build/upload phases.
- Hard-stop on source drift, a held release lock, incomplete Play track reads,
  version mismatch, unexpected worktree changes, missing credentials, or any
  failed lint/build/test/sync/signing/upload gate.
- Never fall back to a guessed local build number for a Play upload.
- Never upload a stale AAB after a failed gate.

## Execution

1. Load `.agents/workflows/android-release.md`.
2. Confirm the intended released source tag and rollout mode.
3. For production, run the canonical command:

   ```bash
   npm run android:production-release -- \
     --yes \
     --source-ref=v<package.json-version> \
     --managed-publishing=off-confirmed \
     --rollout=manual
   ```

4. Let the runner exclusively handle:
   - exact-source and clean-worktree validation
   - repo-wide release locking
   - native bootstrap/preflight
   - strict four-track Play reads
   - idempotent version preparation
   - version commit/freeze
   - lint, one production build, tests, and Capacitor sync
   - immediate pre-upload version validation
   - signed AAB build
   - selected production upload mode
   - default Open testing automatic-release submission for manual rollout
   - strict production and Open testing confirmation
5. Treat the runner's machine-readable phase markers as the authoritative
   boundary between upload work and later Console work.
6. After Open testing reaches `Published`, use the workflow's Production
   review continuation procedure. Verify tester eligibility, confirm Managed
   publishing is ON, audit the complete pending-change set, and submit only the
   existing Production draft through Play Console.
7. Confirm Publishing overview lists the exact production version under
   `Changes in review` and reports that the expected change was sent.
8. If browser control is interrupted, re-read Publishing overview before any
   retry. Never infer submission success from the click attempt and never use
   Fastlane as a Console-submission bypass.
9. After production review passes, stop at `Ready to publish`. Inspect every
   included change and require explicit user approval before the manual Publish
   action that starts production rollout.
10. Use lower-level Fastlane lanes only for diagnosis or a workflow-documented
   recovery. Do not bypass the runner's source, lock, version, or gate checks.
11. If local release inputs are missing, check the configured primary release
   checkout before reporting them absent.
12. Report the exact source, version/build, gate results, AAB, upload mode, and
   confirmed Play production status.

## Required Outputs

- Exact release source tag/SHA and release `HEAD`
- Lock outcome
- Version name, Play max, and selected build number
- Whether preparation reused or changed the local build
- Pre-deploy gate results
- Local Fastlane AAB path
- Production rollout mode (`draft/manual` or `completed`)
- Runner phase, `PRODUCTION_REVIEW_SUBMITTED`, and `NEXT_ACTION` markers
- Confirmed Play production version code, release name, and status
- Confirmed Open testing version code, release name, and status for manual rollout
- Managed publishing state before Open testing and before production review
- Confirmed Open testing published/live state after review
- Open testing active/paused state, release time, tester availability, tester
  opt-in URL, and enabled country/region count/list
- Exact pending-change count and complete audited change list before Production
  review submission
- Production review status and the remaining explicit manual-publish action
- Browser-interruption recovery outcome, when applicable
- Missing inputs or hard-stop blocker, if any
