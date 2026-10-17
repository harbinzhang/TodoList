---
description: Prepare and ship one exact tagged Android source to Google Play with strict versioning, exclusive local execution, and explicit rollout state
---

# Android Release Workflow

## Primary Command

Production Android releases must use the repository runner:

```bash
npm run android:production-release -- \
  --yes \
  --source-ref=v<package.json-version> \
  --managed-publishing=off-confirmed \
  --rollout=manual
```

`--rollout=manual` is the default. It uploads the AAB to the Play production
track as a draft, so no production rollout starts. The runner then promotes
that exact `versionCode` from the production draft to Open testing (`beta`) as
a completed release and submits the Open testing change for Play review. With
Managed publishing OFF, Google Play publishes Open testing automatically after
approval. A human still submits and publishes the production rollout later.

Use `--rollout=completed` only when the user explicitly asks to start/complete
the production rollout automatically. Explicit production approval is required
for either mode.

## Release Phases

Do not use a single generic "release succeeded" status. Report the furthest
confirmed phase:

| Phase | Authoritative evidence | Next action |
|---|---|---|
| `OPEN_TESTING_SUBMITTED` | The runner confirmed the exact Production draft and Open testing release | Wait for Open testing to become `Published` |
| `OPEN_TESTING_PUBLISHED` | Play Console shows the exact Open testing version as Active and released to testers | Turn Managed publishing ON and audit the Production review submission |
| `PRODUCTION_IN_REVIEW` | Publishing overview lists the exact Production change under `Changes in review` | Wait for Google review |
| `PRODUCTION_READY_TO_PUBLISH` | Publishing overview lists the reviewed change under `Changes ready to publish` | Audit every ready change and obtain explicit rollout approval |

The manual runner must print:

```text
ANDROID_RELEASE_PHASE=OPEN_TESTING_SUBMITTED
PRODUCTION_REVIEW_SUBMITTED=false
NEXT_ACTION=wait_for_open_testing_published
```

These markers describe the runner boundary, not the eventual Console state.
Never report Open testing as live or Production as submitted/published from the
runner markers alone.

## Managed Publishing Contract

Google Play Managed publishing is app-wide and cannot be configured separately
for Open testing and Production.

For the default manual workflow:

1. Verify in Play Console that Managed publishing is OFF before the runner.
   If it is ON, changing it requires explicit approval because the setting
   affects every pending app change.
2. Pass `--managed-publishing=off-confirmed`. The runner hard-stops without
   this live operator confirmation.
3. The Open testing release uses `completed` and
   `changes_not_sent_for_review=false`, so it publishes automatically after
   Play approval while Managed publishing remains OFF.
4. Do not treat Fastlane `completed` status as proof that testers can receive
   the build. Confirm the submission reaches `Published` and the Open testing
   track exposes the exact version after review.
5. Only after Open testing is published, turn Managed publishing ON before
   submitting the existing production draft for review.
6. Submit the existing production draft through Play Console and confirm
   Publishing overview lists that exact version under `Changes in review`.
   Do not substitute `--rollout=completed` or `promote_to_production`.
7. After production review passes, confirm it is `Ready to publish`. Publishing
   it is the manual production rollout and requires explicit user approval plus
   an exact inspection of every change included by the Publish action.

If Managed publishing is ON during the Open testing review, the release will be
held at `Ready to publish` and is not automatic. If it remains OFF for the
production review, approved production changes may publish automatically. Both
states violate the default workflow.

Do not assemble a production release by independently running preparation,
build, sync, and upload commands in multiple agent tasks. The runner holds one
repo-wide lock across the complete flow so another invocation stops before it
can mutate version files or rebuild shared output.

## Production Review Continuation

Use this procedure when the runner has already uploaded the exact build. This
is a continuation of the existing release, not a reason to rebuild or upload.

1. Reconfirm the intended package version and shared build number from the
   clean `native-release` worktree.
2. Read all four Play tracks for diagnosis and confirm the intended
   version/name is still present in Production and Open testing. Treat Fastlane
   release statuses as track data only; duplicate Production entries such as
   the same version appearing as both `draft` and `completed` do not prove
   review or public availability.
3. In the Open testing Console page, require all of:
   - track state `Active`
   - exact latest release name/build
   - visible released timestamp
   - tester availability
   - actual enabled country/region count/list, confirmed against the intended
     coverage
4. Record the tester opt-in URL. An Open testing release does not automatically
   enroll existing Production users; tester account enrollment and Play
   country eligibility still apply.
5. Confirm Managed publishing is ON before opening the Production submission.
6. In Publishing overview, expand `Changes not yet submitted for review` and
   audit the complete change set. The default release must contain exactly one
   expected change:

   ```text
   Production
   <exact version>
   Start full rollout
   ```

   The `Submit N changes for review` count must equal the audited change count.
   Any extra version, store listing, policy, country, testing, or other app
   change is a hard stop. Do not use `Save for later` or remove changes without
   separate explicit approval.
7. Submit the audited change and confirm the final review dialog.
8. Require both post-submit signals:
   - the exact change appears under `Changes in review`
   - Play Console reports that the expected number of changes was sent for
     review
9. Stop. Managed publishing must remain ON, and no Publish action is allowed
   until review passes and the user explicitly approves Production rollout.

Do not rerun `android:production-release`, rebuild, increment versions, upload
another AAB, use `--rollout=completed`, or call `promote_to_production` while
continuing an existing release.

### Browser Interruption Recovery

If Play Console control disconnects, times out, or becomes ambiguous during
submission:

1. Do not infer success or failure from the click attempt.
2. Reopen Publishing overview in the authenticated Play Console profile.
3. Classify the exact version from visible Console state:
   - under `Changes in review`: submission succeeded; do not click again
   - under `Changes not yet submitted for review`: repeat the complete pending
     change audit before one retry
   - under `Changes ready to publish`: review passed; stop before Publish
   - missing, duplicated across unexpected sections, or otherwise ambiguous:
     hard-stop and report the visible evidence
4. Never substitute a lower-level Fastlane lane for the Console review
   submission.
5. If the authenticated Chrome connection itself cannot be restored, leave the
   release unchanged and request recovery of that signed-in browser session.

## Open Testing Availability

Fastlane status `completed` means the track release configuration completed; it
does not prove that a particular phone can receive the build. Before reporting
Open testing as usable, record:

- Active or paused track state
- exact release name and version code
- released timestamp
- tester availability and opt-in URL
- enabled country/region count and list, confirmed against the intended
  coverage

If a phone does not see the update, first verify that its Google account joined
the test, the Play country is eligible, and the installed version code is older
than the test build. Changing tester rules or country coverage is a separate
Play mutation and requires explicit approval.

## Release Source

- Default working branch: `native-release`.
- `--source-ref` must identify the exact released tag whose application code is
  being packaged, normally `v<package.json version>`.
- The runner compares `HEAD` with that source before changing anything.
- Only these differences may exist beyond the source tag:
  - `release/version.json`
  - `android/app/build.gradle`
  - `ios/App/App.xcodeproj/project.pbxproj`
  - Android Play changelog files under
    `android/fastlane/metadata/android/<locale>/changelogs/<code>.txt`
- Any application, package, Functions, native runtime, build configuration, or
  other source drift is a hard stop. If newer `dev` work is intended for the
  mobile release, release and tag that source first; do not package it under an
  older app version.
- The tracked worktree must be clean when the runner starts.

## Exclusive Execution

The runner acquires `android-production-release.lock` in Git's common directory.
The lock covers every worktree sharing the repository.

- Lock acquisition happens before credentials, version preparation, builds, or
  uploads.
- A second release invocation reports the recorded owner and exits.
- The lock is released in a `finally` path after success or failure.
- Do not delete a lock merely because a run is slow. Confirm that the recorded
  process is no longer active before any manual recovery.

## Local Release Inputs

The runner executes:

```bash
npm run native:bootstrap:android
npm run native:preflight:android
```

Bootstrap copies gitignored inputs from `$PERKMON_RELEASE_CONFIG_DIR`, or from
`~/Library/Mobile Documents/com~apple~CloudDocs/Project/perkmon` when the
variable is unset.

Required local inputs:

- root `.env.production`
- `android/app/google-services.json`
- `android/app/perkly-release.keystore`
- `android/fastlane/.env`
- `android/fastlane/play-store-key.json`
- Android SDK configuration such as `android/local.properties`
- Ruby 3.3.5 through rbenv
- JDK 21 from `$ANDROID_JAVA_HOME` or Android Studio's bundled JBR; the runner
  pins `JAVA_HOME` and `PATH` so a newer ambient Java cannot reach Gradle

If an input is absent, check the primary configured release checkout before
recreating anything. Never invent replacement credentials or commit secrets.

## Play-Derived Version Preparation

`npm run android:prepare-release` is strict and idempotent:

1. Read `internal`, `alpha`, `beta`, and `production`.
2. Hard-stop if any track cannot be read.
3. Compute `playNext = max(all track versionCodes) + 1`.
4. Compute `target = max(currentLocalBuildNumber, playNext)`.
5. Synchronize the target into shared version metadata and native projects.

Examples:

| Local | Play max | Result |
|---:|---:|---:|
| 87 | 87 | 88 |
| 88 | 87 | 88, unchanged |
| 89 | 87 | 89, unchanged |
| 89 | 89 | 90 |

There is no implicit offline/local-increment fallback in the production
workflow. If Play cannot be read, stop.

After preparation, the runner runs `npm run version:check` and commits only the
three native version files when they changed:

```text
chore: prepare native release build <buildNumber>
```

The version/app target is then frozen. Any later version change, unexpected
tracked dirt, or `HEAD` change is a hard stop.

## Required Gates and Build

The runner performs these steps in one process:

1. Native bootstrap and preflight
2. Strict, idempotent Play-derived version preparation
3. `npm run version:check`
4. `npm run lint`
5. `npm run build:prod`
6. `npm run test`
7. `npx cap sync android`
8. Fastlane `validate_version_code`
9. Fastlane signed AAB build
10. Production upload in the explicitly selected rollout mode
11. For manual rollout, promote the exact production draft to Open testing and
    submit it for automatic release after Play review
12. Read-only production and Open testing confirmation

The production web bundle is built exactly once. The runner calls Capacitor
directly after that build instead of using `npm run android:sync`, because
`android:sync` intentionally includes its own standalone production build.

Any failed lint, build, test, sync, signing, Play-read, version, or upload gate
is a hard stop. Do not skip ahead or upload an older AAB. Report the failing
command and wait for user direction.

Expected AAB:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Fastlane Lanes

The runner uses these lanes:

- `print_next_version_code`: strict four-track version snapshot
- `validate_version_code`: confirms local code is greater than every Play track
- `build`: signed release AAB
- `upload_production_draft`: direct production draft; requests
  `changes_not_sent_for_review=true` when Play permits it, with Fastlane's
  narrow compatibility retry for apps whose review policy forbids that query
- `promote_production_to_open`: for manual rollout, selects the exact frozen
  `VERSION_CODE` from production, promotes it to Open testing as `completed`,
  and submits the Open testing change for automatic release after review
- `upload_production_completed`: direct production completed release
- `print_track_versions`: strict four-track snapshot of version codes, release
  names, and release statuses
- `confirm_production_release`: hard assertion that the expected production
  version code has the frozen version name and selected release status
- `confirm_open_testing_release`: hard assertion that Open testing contains the
  frozen version name/code with `completed` release status

Legacy/testing lanes remain available:

- `deploy_internal`
- `promote_to_open`
- `promote_to_production` (completed production promotion)

Do not use `promote_to_production` for a manual rollout.

## Dry Run

Use:

```bash
npm run android:production-release -- \
  --dry-run \
  --source-ref=v<package.json-version> \
  --rollout=manual
```

Dry-run validates the branch, clean worktree, source tag, version match, and
source drift, then prints the exact command plan. It performs no Play writes,
version changes, commits, builds, or uploads.

## Upload Verification

After upload and any default Open testing promotion, `print_track_versions`
must succeed for all four tracks. `confirm_production_release` must match the
exact frozen release, and manual rollout must also pass
`confirm_open_testing_release`.

Confirm:

- production includes the intended `versionCode`
- release name equals `package.json` version
- manual rollout reports `draft`
- completed rollout reports `completed`
- manual rollout also places the same version name/code in Open testing with
  `completed` status and an automatic-release review submission
- the uploaded target still matches the frozen local version state

Do not report success from the upload command alone.
Do not report Open testing as live from the track status alone; confirm
`Published` after review. Do not report production as safely manual unless
Managed publishing is ON before its review submission.
Do not interpret duplicate or `completed` Production API entries as proof of
review or consumer visibility. Publishing overview is authoritative for
`Changes not yet submitted for review`, `Changes in review`, and
`Changes ready to publish`.

## Reporting

Report:

- release branch, exact `HEAD`, and selected source tag/SHA
- lock acquisition outcome
- preflight results
- Play max and selected local build number
- whether version preparation changed or reused the build number
- version commit, if created
- lint/build/test/sync/validation results
- AAB path
- upload lane and rollout mode
- runner phase, `PRODUCTION_REVIEW_SUBMITTED`, and `NEXT_ACTION` markers
- confirmed Play production version code, release name, and status
- confirmed Open testing version code, release name, and status for manual rollout
- Managed publishing OFF confirmation before Open testing submission
- Open testing review result, Active/Published confirmation, release timestamp,
  tester availability, opt-in URL, and enabled country/region count/list
- Managed publishing ON confirmation before production review submission
- exact audited pending-change count/list before Production review submission
- Production review result, post-submit proof, and remaining manual
  publish/rollout action
- browser-interruption classification and recovery outcome, when applicable
- any missing local inputs or hard-stop blocker
