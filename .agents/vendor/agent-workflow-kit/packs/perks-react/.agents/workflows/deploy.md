---
description: How to deploy the application to Firebase (hosting, functions, rules)
---

# Deploy to Firebase

## Prerequisites

- Firebase CLI installed and authenticated (`firebase login`)
- `.env.production` or `.env.staging` configured with real Firebase credentials
- `VITE_USE_EMULATORS=false` in the selected hosted env file (enforced by `src/safety.ts`)

## Failure Classification

A failed check blocks the next unsafe production mutation until the failure is
resolved. It does not automatically end the turn or require another user
confirmation.

Only `/deploy` may run production deploy commands. Do not run any production deploy command unless the user has explicitly acknowledged the production target for that deploy.

### Continue automatically

Keep diagnosing and recover without asking the user when the action stays
inside the already-authorized deploy:

- fix a deterministic local deploy-tool or test-harness defect, rerun its
  focused checks, and resume the same frozen checkpoint
- correct and retry a read-only verification invocation
- reconcile a Firebase CLI timeout/nonzero with authoritative Function or
  Cloud Run state; continue when the intended revision is Ready and the
  callable smoke passes
- resume only failed or pending surfaces while preserving verified artifacts
  and successful surface evidence

### Pause production mutation and ask the user

Ask only when continuing requires a new production decision or authority:

- E2E failures (including setup failures, flaky auth setup, wrong app/port under test)
- Missing, duplicate, or invalid non-secret Functions deploy params that are not covered by the narrow safe default-off policy
- Firestore rules compile warnings or errors
- Firestore index-dependent code about to go live before its new index is serving
- Build/lint/audit failures
- Emulator/env mismatch that makes verification unreliable
- Production Hosting marker mismatch after deploy (`/sw-build-meta.js` does not match the just-built `dist/sw-build-meta.js`)
- target project, branch/SHA, requested surface, or destructive deletion-set ambiguity
- artifact, deploy-input digest, target identity, or resume-binding mismatch
- a new secret, permission, billing choice, data deletion, or scope expansion
- remote state that remains ambiguous or unhealthy after bounded reconciliation

Continue read-only investigation while mutation is paused. If a deterministic
in-scope fix resolves the blocker and clean checks prove it, continue the
authorized deploy without asking for another `continue`.

Before a Functions deploy, `scripts/deploy-firebase.sh` generates the Functions
manifest and reconciles every non-secret manifest param with
`functions/.env.<projectId>`. This happens before Firebase CLI deploy analysis,
so a new param cannot pause an unattended ship with an interactive prompt.

The only automatic repair allowed is adding `false` for a param on the
checker's explicit safe-default-off allowlist when the generated manifest also
declares that boolean with `default: false`. Preserve an existing explicit
`true` or `false`. Never infer or write `true`, copy a secret, guess a business
configuration value, or repair an unknown param. Duplicate keys, invalid
boolean values, and every other missing non-secret param are hard-stop
blockers. Any automatic addition is local-only, must remain ignored, and must
be reported with the env path and param name.

Exception for staging callable post-deploy smoke only: `scripts/check-callable-public-access.mjs`
has per-function request timeouts and retries only transient `request_failed`
failures for the same callable. If the Firebase staging deploy body already
completed and the only failure is a callable public-access timeout/network
`request_failed`, rerun only that callable smoke once, or rely on the script's
built-in per-function retry. Continue only when every callable returns an
expected callable JSON response such as `UNAUTHENTICATED` or `INVALID_ARGUMENT`.
Do not apply this exception to 403 platform access failures, 404 missing
functions, unexpected response bodies, missing env/config/secrets, billing or
minimum-cost prompts, deploy-body failures, staging QA failures, or anything
that requires product or infrastructure judgment.

## Downtime / Outage Risk Framing

Firebase Hosting deploys are expected to be atomic and should not create a traditional downtime window. Still, deploys can cause application-level outages if Functions, Firestore rules, Storage rules, indexes, secrets/IAM, or frontend/backend contracts are wrong or roll out in the wrong order.

Treat deploy success as verified surface health, not just a successful Firebase CLI exit. For Hosting, prove the live build marker. For Functions, rules, indexes, and Storage, use the relevant post-deploy checks below and report each requested surface separately.

## Completion and Partial-Failure Rules

Treat deploy completion as surface-specific. A full deploy requests these production surfaces: `Hosting`, `Functions`, `Firestore rules`, `Firestore indexes`, and `Storage rules`. If a full deploy fails partway and a follow-up deploy retries only one surface, report only that surface as complete unless every originally requested surface is reverified.

HTTP 200 is not Hosting deploy proof. It only proves an old or new app shell is reachable. For `full` and `hosting` deploys, the proof is the live `sw-build-meta.js` marker matching the frozen Web artifact.

Never pass `--force` to a multi-surface Firebase deploy. If production must
match the current source or staging Function set, compare the remote Function
inventory with the generated/local manifest, show the exact deletion plan, and
delete only the exact approved Function names. Deploy the remaining Functions
without widening force to Firestore rules/indexes, Storage, or Hosting.

When Firebase CLI returns nonzero after Function mutations, do not infer that
every named Function failed. Reconcile each reported Function against
authoritative remote state. A Ready intended revision plus passing callable
access smoke is verified Function evidence; an unknown revision, failed
health, or unexpected IAM response remains a blocker.

## Immutable Artifact and Resume Contract

Every Web or Admin deploy has one stable run ID:

```bash
SHIP_RUN_ID=<stable-id>
npm run deploy:staging -- --run-id "$SHIP_RUN_ID"
```

The deploy script freezes the post-retention Web output at
`.firebase/ship-runs/<run-id>/artifacts/web/public` and Admin output at the
parallel `admin/public` path. Each surface has a `DeployArtifactManifestV1`
containing the Git SHA, tag, target, version, build identity, retained-from
identity, file/byte counts, and complete SHA-256 digest. Firebase's temporary
config points at that frozen directory, never mutable `dist`.

`PERKMON_BUILD_TIME` is frozen in `state.json` and drives deterministic Web
and Admin build IDs. Before every Hosting deploy attempt, the script verifies
the artifact digest and identity again, byte-compares its digest with the
completed build source inside the separately frozen `deploy-inputs` tree,
derives Web/Admin metadata from that source, requires those values to match the
artifact manifest, and requires the manifest to match the artifact evidence
already recorded in `state.json`. Artifact adoption after an interrupted
atomic rename uses the same source-bound verification. Replacing an entire
artifact plus manifest with a different self-consistent build therefore hard
stops. The script quarantines only the Firebase cache whose key exactly matches
that frozen public directory.

Before the first Firebase CLI body for each target/scope, the deploy script
copies every deploy-relevant prepared input into the run-scoped immutable
`deploy-inputs` tree and records its checkpoint binding:
`firebase.json`, `.firebaserc`, selected rules/index files, selected non-Web
Hosting public directories, the complete Firebase-uploaded Functions tree,
generated `functions.yaml`, the applicable `functions/.env.<projectId>`, and
the completed Web/Admin build source used to derive the separate Hosting
artifact.
Only file metadata and digests enter the checkpoint; credential values are
never logged or recorded. A generated frozen Firebase config replaces every
deploy path with its frozen path and removes Functions/Hosting predeploy
commands after their explicit preparation gates.
The complete frozen tree digest and exact file set are reverified before every
deploy phase, and Firebase CLI runs with that config from the frozen root.
The generated Firebase config is resource-pruned: an indexes-only run contains
only the frozen indexes path, a rules-only run only the frozen rules path, and
unselected Functions, Hosting, Firestore, or Storage sections are removed.
Firebase CLI must never be able to validate a path that the selected scope did
not freeze.
Later worktree changes therefore cannot alter uploaded bytes. Resume requires
the same recorded tree and digest, skips the Functions prepare/install/lint/
build sequence, and may only adopt an already-complete frozen tree from the
narrow publish-before-checkpoint interruption window. If interruption happens
after that tree is frozen but before the separate Hosting artifact exists,
resume derives the missing artifact only from the verified frozen build source;
it never reads mutable `dist`, the Admin output directory, or rebuilds.

Resume an interrupted staging deploy only with the original run ID:

```bash
npm run deploy:staging -- --run-id "$SHIP_RUN_ID" --resume
```

Resume mode must find a valid checkpoint and artifact; it skips builds and
already-passed backend phases only after the recorded phase evidence matches
the current target, scope, normalized Firebase resource set, and applicable
Functions diff base. Reusing a run ID across a different target/scope/resource
plan, or changing the Functions diff base after a Functions phase passed, is a
hard stop before any phase can be skipped. The top-level checkpoint identity
also reasserts the recorded Functions diff base on resume.

An existing checkpoint that already contains evidence for the same deploy
surface/plan cannot be entered again without `--resume`. The shared ship run
may start its first Admin deploy without `--resume` after Web has completed,
because Admin has a distinct artifact and `admin_deploy` phase. A later Admin
retry must use `--resume` and the recorded Admin artifact. Resume validates
bindings for passed, failed, and running phases before any phase can be
overwritten, so changing target/scope/resources after a partial failure hard
stops.

For a Web-to-Admin ship transition, `backend_deploy`, `web_deploy`,
`staging_web_marker`, `strict_qa`, `deep_qa`, `tracker_qa`, and
`roadmap_publish` must each be `passed` or explicitly `skipped`. Missing,
failed, running, or pending evidence blocks Admin Hosting. A standalone Admin
run with no Web transition evidence remains supported. A failed Admin deploy
may be re-executed once; a second failed deploy attempt consumes the retry and
future deploy resumes hard stop. If an immutable artifact was atomically
published immediately before an interruption, resume may adopt it only after
recomputing its digest and matching run ID, target, surface, Git SHA, tag, and
build time to the active checkpoint.

A finalized checkpoint is terminal: deploy entry, phase/artifact recording,
and identity mutation all hard stop. Only idempotent finalization cleanup may
continue while `cleanup.status=pending`.

The prior Web/Admin marker is captured durably before publishing deploy-input
or artifact evidence. Resume may adopt a missing marker only while no
surface-matching deploy-input, artifact, or deploy-phase evidence exists.
Resume otherwise hard stops on a missing prior marker, SHA/tag/build-time or
digest mismatch, or a live marker that is neither the captured previous build
nor this run's frozen artifact. A later live staging build therefore cannot be
rolled back by an old checkpoint. The same
pre-deploy marker rule applies to Admin Hosting using
`admin-build-meta.json`, including its build time; an Admin retry cannot
replace a later Admin build from an older checkpoint. Every initial or resumed
Admin Hosting attempt recaptures and validates the live marker immediately
before entering the Firebase deploy body, after frozen-input/artifact
verification and cache isolation. Web uses the same last-moment gate for both
the first attempt and its single eligible staging retry. Before the first Admin
marker has ever been deployed, a non-resume deploy may capture only a
recognizable legacy Admin SPA response as `legacy_unmarked`, including an exact
SHA-256 body digest. A resume may continue from that baseline only while the
live legacy response matches the captured digest exactly, or after the live
marker matches this run's frozen Admin artifact. Malformed JSON, arbitrary HTML,
and changed legacy content remain hard stops.

For staging `full`, the fixed order is the scope-aware Firestore index
predeploy gate, Functions, callable public-access verification,
Firestore/Storage rules and indexes, Web Hosting, marker and retention
verification, then strict QA. Hosting is not switched after a backend failure.
A stale-previous marker may trigger exactly one Hosting-only retry with the
same artifact. Unknown, malformed, inconsistent, 403/404/5xx, or repeated
marker failures hard stop. Production never auto-retries Hosting.

Versioned Admin marker metadata treats `releaseTag` as nullable so an untagged
standalone Admin deploy remains resumable. A present tag must still match
exactly; absence is never treated as a wildcard.

## Production Version Baseline

Before any production deploy command, read and record the currently live production web build markers. Do this before running the deploy build, because after deployment the old marker is overwritten and cannot be reconstructed reliably from local Git.

```bash
node --input-type=module <<'NODE'
import { parseSwBuildMeta } from './scripts/lib/sw-build-meta.mjs'

const endpoints = [
  'https://perks-react.web.app',
  'https://perks-react.firebaseapp.com',
  'https://perkmon.app',
]

for (const baseUrl of endpoints) {
  const markerUrl = `${baseUrl}/sw-build-meta.js?preDeployCheck=${Date.now()}`
  const response = await fetch(markerUrl, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`${markerUrl} returned HTTP ${response.status}`)
  }
  const metadata = parseSwBuildMeta(await response.text())
  console.log(JSON.stringify({ baseUrl, ...metadata }))
}
NODE
```

Hard stop before production deploy if any production entrypoint cannot be read, returns malformed metadata, or disagrees on `appVersion`, `buildId`, or `releaseTag` when present. Report the mismatch instead of inferring production state from local `package.json`, local tags, or the active branch.

Resolve the production baseline from this live marker before deciding deploy scope:

1. Prefer `releaseTag` when present.
2. If no `releaseTag` exists, derive `v<appVersion>` and explicitly warn that this is version-derived rather than marker-proven.
3. Fetch tags if needed and verify the baseline ref exists.
4. Compare `PROD_REF..TARGET_REF` and the dirty worktree before choosing `full`, `hosting`, `admin`, `functions`, `rules`, `storage`, or `card-assets`.

The deploy report must include the pre-deploy production `appVersion`, `buildId`, endpoint consistency, resolved `PROD_REF`, target ref, changed runtime/config surfaces, and the reason each requested surface was included or skipped. Do not justify a selective production deploy from local branch/tag state alone.

## Staging-Verified Production Promotion

Use this path when the user wants the exact release that just passed canonical
staging validation promoted to production. Reuse the staging checkpoint's
source identity, digests, and phase evidence; never reuse its Web bytes because
Vite embeds the staging Firebase environment.

1. Complete the Production Version Baseline and resolve `PROD_REF` from the
   live marker.
2. Check out the exact `releaseSha` recorded by the successful staging run.
   Do not promote a later support/tooling HEAD under the staging SHA's evidence.
3. Inspect the promotion plan without deploying:

```bash
npm run deploy:prod:promote -- \
  --staging-run-id "<staging-run-id>" \
  --prod-ref "<PROD_REF>" \
  --plan
```

The plan hard-stops unless the checkpoint contains matching staging Web
artifact and full deploy-input digests plus passed Functions, rules, Web,
backend, marker, strict QA, deep QA, tracker QA, and main-promotion phases.
Successful ship cleanup may compact the staging bytes; checkpointed digests
remain valid evidence because production rebuilds from the exact Git SHA.

4. Use the plan's index result:
   - `not_required` means `PROD_REF` and the target contain byte-identical
     `firestore.indexes.json`, staging index preflight passed or was safely
     skipped, and no missing-index evidence was found.
   - `required` means run the dedicated production index predeploy gate and
     wait for remote completion before continuing.
5. Execute the plan through the Production Full Deploy Orchestration below,
   using one stable parent run ID and its deterministic surface child IDs.
   The staging evidence remains bound to the exact SHA while Hosting rebuilds
   with `.env.production`. Do not execute a monolithic multi-surface promotion
   command.

When the plan requires index priming, complete the dedicated frozen index run
and remote-operation check before starting the Functions child.

The sequence freezes production Functions env/config/rules inputs separately,
builds Web with `.env.production` only for the Hosting child, and verifies all
three production entrypoints. It does not deploy Admin Hosting or card assets
unless those surfaces are separately requested.

For production `full` and `hosting` deploys, verify all production web entrypoints:

```bash
cat dist/sw-build-meta.js
curl -fsS "https://perks-react.web.app/sw-build-meta.js?deployCheck=$(date +%s)"
curl -fsS "https://perks-react.firebaseapp.com/sw-build-meta.js?deployCheck=$(date +%s)"
curl -fsS "https://perkmon.app/sw-build-meta.js?deployCheck=$(date +%s)"
```

The `appVersion` and `buildId` must match the local `dist/sw-build-meta.js` generated by the deploy build. Do not call production Hosting complete when only `https://perkmon.app` returns HTTP 200.

## Dirty Worktree Handling

Before deploying, classify local changes into one of these buckets:

- **Runtime/config changes** — app source under `src/`, Cloud Functions runtime code under `functions/src/`, Firebase rules, build/deploy scripts, env files, or config files such as `package.json`, `firebase.json`, `vite*.ts`, `tsconfig*.json`, `eslint.config.js`. These are deploy-relevant and must be reviewed as part of the deploy scope.
- **Non-runtime support changes** — docs, `exp/` scripts, test files, `e2e/` support/tests, and similar non-production support artifacts. These do not block deploy by themselves when they are the only uncommitted changes.
- **Temporary/local-only artifacts** — local worktree clones, scratch files, debug logs, and other machine-local files such as `.claude/worktrees/**`. These should be ignored for deploy decisions and should not be committed as part of normal deploy prep.

Deploy rule:

- If the dirty worktree contains only non-runtime support changes plus temporary/local-only artifacts, deploy may continue.
- If temporary/local-only artifacts are present, exclude them from cleanliness checks and leave them uncommitted.
- If non-runtime support changes are present and a clean history is preferred, batch-commit them before continuing, but do not block deploy on them.
- If any runtime/config change is present, treat the worktree as deploy-relevant and review it normally before continuing.

---

## Firestore Index Predeploy Gate

Firestore index builds are long-running operations. A Firebase deploy can expose new Hosting or Functions code before a newly declared Firestore index has finished building, and the dependent query can fail in production with `FAILED_PRECONDITION` / "query requires an index" during that window.

Run this gate before any `full`, `hosting`, `functions`, or specific-function deploy when either condition is true:

- `firestore.indexes.json` changed in the release.
- The release adds or changes a Firestore query shape whose required composite
  or collection-group index is not already present in the production baseline
  declarations, or a query is already seen failing with
  `FAILED_PRECONDITION`.

A query-shape diff is a review trigger, not automatic evidence that an index
must be created. For an exact staging promotion, skip this gate only when the
promotion plan proves the production baseline and target index declarations
are byte-identical, staging index preflight passed or was safely skipped, and
there is no error/review evidence of a missing index. If any of those facts is
unknown, run the gate.

### Gate Procedure

1. Identify the target and require the normal production acknowledgement before any production command.
2. Deploy indexes alone, without rules, Hosting, or Functions:

```bash
bash scripts/deploy-firebase.sh staging firestore-indexes \
  --run-id "<ship-run-id>-index-predeploy"
```

Production:

```bash
bash scripts/deploy-firebase.sh prod firestore-indexes \
  --run-id "<ship-run-id>-index-predeploy"
```

3. Wait until Firestore reports no in-progress index build operations for the target project:

```bash
gcloud firestore operations list --project perkly-staging-7dab8
```

Production:

```bash
gcloud firestore operations list --project perks-react
```

Treat any `CREATE_INDEX` / `UPDATE_FIELD` operation that is not done as a blocker for dependent code deploy. If an operation is still running, poll or describe it until complete:

```bash
gcloud firestore operations describe OPERATION_NAME --project perks-react
```

4. Only after the needed index operation is complete, continue with the selected deploy path below.
5. For a dedicated index-predeploy run, record its `cleanup` phase and finalize
   it with required phases `firebase_deploy,cleanup` only after the remote
   operation completes. Retain a blocked run's checkpoint and frozen inputs,
   and use the same run ID with `--resume` instead of starting the deploy again.
   If that sub-run is already finalized-passed, do not invoke Firebase again:
   recheck remote operation health and continue by recording the parent gate.
6. In the final report, explicitly say whether the index gate was not applicable, completed, or blocked.

Do not use `npm run deploy:*:rules` as the index-predeploy command when the
goal is only to prime indexes. Those scripts deploy both Firestore rules and
indexes. Use `scripts/deploy-firebase.sh ... firestore-indexes` with a stable,
dedicated run ID so the index bytes are frozen and checkpoint-bound without
colliding with the later full-deploy checkpoint.

---

## Full Deploy (Hosting + Functions + Rules/Indexes)

Deploys the built frontend, staging legacy redirect hosting, Cloud Functions, and Firestore/Storage rules plus indexes.

Card asset hosting is explicit-only. Do not include `hosting:cardAssets` in full or hosting-only deploys unless card art or card asset hosting config changed and the user explicitly asks for card assets.

If the release is index-dependent, complete the Firestore Index Predeploy Gate before this full deploy. The full deploy may still include `firestore:indexes`, but it must not be the first time a required new index is created for already-live dependent code.

### Staging

// turbo
1. Run from the project root:
```bash
SHIP_RUN_ID=<stable-id>
npm run deploy:staging -- --run-id "$SHIP_RUN_ID"
```

This runs the shared staging workflow script, which:

- runs root lint
- runs `npm run build:staging`
- runs Functions vendor integrity, install, lint, and build checks
- generates the Functions manifest and reconciles non-secret deploy params before Firebase CLI can prompt; only explicitly allowlisted `default: false` safety booleans may be added mechanically
- freezes Web output and deploys Functions/callable access, then
  rules/indexes/Storage, then `hosting:web,hosting:legacyStagingRedirect`
- when `FUNCTIONS_DIFF_BASE=<ref>` is provided, compares `<ref>...HEAD` and narrows the staging Functions deploy only when the analyzer can prove the affected exported Functions; ambiguous backend/runtime changes keep the full `functions` deploy
- keeps `perkmon-staging.web.app` as the canonical staging app host and turns the legacy `perkly-staging-7dab8.web.app` site into a Hosting-only redirect entrypoint
- leaves `perkmon-staging-card-assets.web.app` unchanged unless `npm run deploy:staging:card-assets` is run explicitly
- auto-runs strict `npm run staging:qa` against the frozen
  `sw-build-meta.js` identity after the live marker matches

Optional diff-aware staging Functions narrowing:
```bash
FUNCTIONS_DIFF_BASE=<base-ref> npm run deploy:staging
FUNCTIONS_DIFF_BASE=<base-ref> npm run deploy:staging:functions
```

This feature is staging-only and default-gated by `FUNCTIONS_DIFF_BASE`; without that env var, staging deploys preserve the full Functions behavior. The analyzer returns `high` confidence for direct exported function entrypoint changes, `medium` confidence for helper changes whose reverse import graph resolves to exported Functions, `none` for no Functions runtime impact, and `low` for ambiguous changes. Low confidence includes `functions/src/index.ts`, deleted Functions sources, `functions/package*.json`, `functions/vendor/**`, `packages/contracts/**`, `packages/shared-runtime/**`, and `firebase.json`; low confidence must widen to full `functions`, not under-deploy.

Manual `npm run staging:qa` is only needed for troubleshooting, when auto-QA was explicitly skipped, or after staging scopes that do not auto-run QA.

Dry-run the checks without deploying:
```bash
npm run check:deploy:staging
```

## Production Full Deploy Orchestration

Production full deploys use separate immutable child runs. This keeps a
successful backend deploy from being repeated during Hosting recovery and
prevents a single Firebase CLI exit code from hiding which surfaces succeeded.

For an exact staging promotion, first complete the promotion plan above. For a
user-authorized current-branch deploy, first complete the same production
baseline, target-diff, dirty-tree, and index classification gates.

Use one stable parent identifier and deterministic children:

```bash
PROD_RUN_ID="<stable-production-run-id>"
```

If the index gate is required, deploy and wait for it first:

```bash
bash scripts/deploy-firebase.sh prod firestore-indexes \
  --run-id "${PROD_RUN_ID}-indexes"
```

Then execute each child only after the prior child is verified:

```bash
bash scripts/deploy-firebase.sh prod functions \
  --run-id "${PROD_RUN_ID}-functions"
```

```bash
bash scripts/deploy-firebase.sh prod firestore-rules \
  --run-id "${PROD_RUN_ID}-firestore-rules"
```

```bash
bash scripts/deploy-firebase.sh prod storage \
  --run-id "${PROD_RUN_ID}-storage"
```

```bash
bash scripts/deploy-firebase.sh prod hosting \
  --run-id "${PROD_RUN_ID}-hosting"
```

Before the Functions child, compare the remote Function inventory with the
generated/local manifest. If the user has already authorized exact parity,
delete only the exact approved Function names with a narrowly scoped
`firebase functions:delete ... --project perks-react --force`; otherwise the
deletion set is a user decision. Never pass `--force` to a multi-surface
Firebase deploy.

Each failed active child resumes with its same run ID and `--resume`. A passed
child is not redeployed: re-run its remote verification and continue to the
next child. A deterministic local script/test defect is fixed and retested
inside the same turn. A Function CLI timeout is reconciled against the exact
remote revision and callable smoke before deciding whether that child passed.

The Functions child runs vendor integrity, install, lint, build, manifest/env
reconciliation, immutable input freezing, deploy, and callable access smoke.
The Hosting child performs the `.env.production` build, freezes the Web
artifact, deploys last, and verifies all production markers and retained
service-worker assets. Card assets and Admin Hosting remain explicit separate
surfaces.

`npm run deploy:prod` remains a low-level monolithic compatibility command; the
`/deploy` skill must not use it for production full deploys or recovery.

---

## Delta-Aware Staging Deploy

Use this staging-only path for a release-tagged rollout that must include every
changed Firebase surface while skipping surfaces proven unchanged:

```bash
npm run deploy:staging:delta -- --target <release-tag>
```

The delta executor derives one stable child run ID per selected Firebase
surface. It invokes each child with `SHIP_FINALIZE_ON_SUCCESS=true`, resumes an
active exact-identity child, and skips a finalized-passed child before rerunning
the surface's remote verification. If finalization was interrupted after
`cleanup.status=pending` was persisted, resume completes only the idempotent
cleanup before proceeding; it never redeploys that child. A successful child is compacted immediately;
a failed child run retains its checkpoint, frozen artifacts, and deploy inputs
for diagnosis and exact resume. The exported parent ship run records
`firebase_deploy` only after every child step succeeds.

Direct `deploy-firebase.sh` invocations that generate their own run ID also
finalize and compact on success. A caller-provided parent run remains open
unless it explicitly sets `SHIP_FINALIZE_ON_SUCCESS=true`, because canonical
ship workflows still need to add later QA, roadmap, Admin, and cleanup evidence.

Optionally override the live staging baseline for a reviewed resume or dry run:

```bash
npm run deploy:staging:delta -- --target <release-tag> --base <live-tag> --plan
```

Add `--include-card-assets` only when changed card assets were explicitly
authorized. The command otherwise stops when card asset changes are detected.

The command:

- requires an annotated semver target tag whose peeled commit is exact
  `release-branch` `HEAD`
- resolves the live staging `releaseTag` unless `--base` is provided
- compares the two committed snapshots, not the active dirty worktree
- reuses the Functions impact analyzer for none/targeted/full selection
- widens missing or ambiguous deploy inputs to full main staging plus admin
- deploys and waits for indexes before dependent surfaces
- deploys rules, Storage, Functions, admin, and authorized card assets with
  their surface-specific checks before public Hosting
- deploys public Hosting last and runs strict staging QA
- verifies the live explicit `releaseTag`
- prints and saves the complete included/skipped-resource and validation plan at
  `test-results/staging-deploy-plan.json`

Treat the artifact's completed steps as surface-specific evidence. A failed
later step does not imply skipped or unfinished surfaces succeeded.

## Selective Deploy

Use these when you only changed one part of the system:

### Hosting Only (frontend changes)

// turbo
1. Build and deploy hosting:
```bash
npm run deploy:staging:hosting
```

For staging, this deploys both the canonical app host and the legacy redirect-only host together so the two staging URLs cannot drift.
It also auto-runs strict `npm run staging:qa` against the just-built `sw-build-meta.js` identity after a successful Firebase deploy.

Production hosting only:
```bash
npm run deploy:prod:hosting
```

Production hosting deploys must end with marker verification against all production web entrypoints. The deploy script performs this automatically; when troubleshooting manually, compare each live `/sw-build-meta.js` response with `dist/sw-build-meta.js`.

### Admin Hosting Only (admin frontend changes)

Admin hosting deploys only the separate admin Hosting site. It does not deploy the public web app, Functions, Firestore rules/indexes, Storage rules, or card assets.

Staging admin hosting:
```bash
npm run deploy:staging:admin -- --run-id "$SHIP_RUN_ID"
```

Production admin hosting:
```bash
npm run deploy:prod:admin
```

Admin Hosting exposes the no-store `/admin-build-meta.json` marker. The deploy
script verifies it matches the frozen Admin manifest. During ship, finish with:

```bash
npm run staging:verify:admin -- \
  --run-id "$SHIP_RUN_ID" \
  --expected-roadmap-sha "$ROADMAP_DEV_SHA"
```

The verifier uses dedicated `STAGING_QA_ADMIN_EMAIL/PASSWORD`, blocks unknown
console/page/5xx/Firestore errors, checks the full roadmap SHA through
Firestore, and saves browser evidence. Admin retries allowed by the ship
workflow's narrow transient exception must reuse the same run ID and
`--resume`.

For production admin deploys, still complete the Production Version Baseline first. The live production web marker establishes the deployed app baseline used for deciding whether admin-only deploy is appropriate, even though the admin site has separate Hosting verification.

### Card Asset Hosting Only (dedicated image site)

Use this only when card art or card asset hosting config changed. Card asset hosting is intentionally excluded from full deploys because the image set rarely changes and large Hosting uploads can be slow or timeout.

```bash
npm run deploy:staging:card-assets
```

Production card assets only:
```bash
npm run deploy:prod:card-assets
```

### Functions Only (Cloud Functions changes)

If the functions change depends on a new Firestore index, complete the Firestore Index Predeploy Gate before deploying functions.

// turbo
1. Deploy functions (the shared script installs, lints, builds, and freezes the
   verified inputs before Firebase CLI runs):
```bash
npm run deploy:staging:functions
```

For staging only, you may narrow the Functions target with an explicit diff base:
```bash
FUNCTIONS_DIFF_BASE=<base-ref> npm run deploy:staging:functions
```

If the analyzer reports no Functions impact, the command exits without deploying Firebase resources. If it reports high or medium confidence, the deploy script uses `functions:name` resources and runs callable public-access smoke only for deployed browser-callable Functions. If it reports low confidence, it falls back to full `functions`.

Production functions:
```bash
npm run deploy:prod:functions
```

### Specific Function

If the specific function depends on a new Firestore index, complete the Firestore Index Predeploy Gate before deploying it.

// turbo
1. Deploy a single function by name through the shared workflow so Functions
   install/lint/build, manifest generation, and deploy-param reconciliation
   still run before Firebase CLI analysis:
```bash
bash scripts/deploy-firebase.sh staging function:functionName
```

Production specific function:
```bash
bash scripts/deploy-firebase.sh prod function:functionName
```

Inspect targeted resource construction without running checks or deploying:
```bash
bash scripts/deploy-firebase.sh staging function:functionName --plan
bash scripts/deploy-firebase.sh prod function:functionName --plan
```

### Firestore Rules/Indexes Only

// turbo
1. Deploy Firestore security rules and composite indexes:
```bash
npm run deploy:staging:rules
```

Production rules/indexes:
```bash
npm run deploy:prod:rules
```

For index priming before dependent code deploy, use the Firestore Index
Predeploy Gate's frozen `firestore-indexes` scope so rules are not changed as
a side effect and the uploaded index file is checkpoint-bound.

### Storage Rules Only

// turbo
1. Deploy storage rules:
```bash
npm run deploy:staging:storage
```

Production storage:
```bash
npm run deploy:prod:storage
```

---

## Pre-Deploy Checklist

- [ ] For production deploys, capture live production `/sw-build-meta.js` from all production web entrypoints before any deploy command and resolve `PROD_REF`.
- [ ] Compare `PROD_REF..TARGET_REF` plus dirty deploy-relevant files before choosing deploy surfaces.
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build:staging` or `npm run build:prod` completes successfully for the target env
- [ ] Functions vendor integrity: `npm run functions:prepare && npm run functions:check-vendor-integrity`
- [ ] Functions lint: `cd functions && npm run lint`
- [ ] Functions build: `cd functions && npm run build`
- [ ] Functions manifest params are present exactly once in `functions/.env.<projectId>`; any automatic write was an allowlisted boolean whose manifest default is `false`
- [ ] If `firestore.indexes.json` changed or a new query shape requires an index absent from the production baseline declarations, complete the Firestore Index Predeploy Gate before dependent Hosting or Functions deploy
- [ ] If card art changed, `npm run sync:card-assets` completes successfully
- [ ] Optional extended check: `RUN_AUDIT=true npm run check:deploy:staging`
- [ ] Optional extended check: `RUN_E2E_LOCAL=true npm run check:deploy:staging` (requires emulators + dev server)
- [ ] Verify `VITE_USE_EMULATORS=false` in the selected hosted env
- [ ] No secrets or `.env` files committed

If any item above fails, **stop deployment** and fix issues first.

## Post-Deploy Verification

- [ ] For Hosting deploys, verify the live build marker, not just page reachability. Production `full` and `hosting` deploys must match `dist/sw-build-meta.js` on `https://perks-react.web.app/sw-build-meta.js`, `https://perks-react.firebaseapp.com/sw-build-meta.js`, and `https://perkmon.app/sw-build-meta.js`.
- [ ] For Admin Hosting deploys, verify the admin Hosting URL returns HTTP 200/HTML (`https://stage-admin-perkmon.web.app` or `https://admin-perkmon.web.app`).
- [ ] Visit the live site and verify pages load after marker verification
- [ ] For staging `full` and `hosting` deploys, confirm `scripts/deploy-firebase.sh` auto-ran strict `npm run staging:qa` with the built `sw-build-meta.js` identity. Run `npm run staging:qa` manually only for troubleshooting, skipped auto-QA, or scopes that do not auto-run QA.
- [ ] If `hosting:cardAssets` was deployed, verify a known card image returns `200 image/png`
- [ ] Check the Firebase Console → Functions for any deployment errors
- [ ] For Functions deploys, confirm browser-callable Functions pass `npm run staging:qa:callables` or the equivalent target-specific callable access smoke. A healthy Firebase callable should return a callable JSON error such as `UNAUTHENTICATED` without credentials, not a Google Frontend `403` HTML page.
  The callable smoke uses per-function request timeouts and retries only
  transient `request_failed` network/timeouts for the same callable, so a single
  slow Cloud Functions request cannot hang the deploy indefinitely. Persistent
  failures still block deploy completion.
- [ ] Check Firebase Console → Hosting for the new deployment entry
- [ ] If the Firestore Index Predeploy Gate ran, confirm no relevant Firestore index operation remains in progress
- [ ] Monitor Cloud Functions logs: `firebase functions:log`

Final reports for full deploys must list each requested surface separately. Do not collapse a partial recovery into "deploy complete" unless every requested surface was verified after the recovery.

## Reference

| Item | Details |
|------|---------|
| Web hosting public dir | `dist/` |
| Card asset hosting public dir | `card-assets/` |
| Functions source | `functions/` (Node 22) |
| Firestore rules | `firestore.rules` |
| Storage rules | `storage.rules` |
| Firebase config | `firebase.json` |
| Safety guard | `src/safety.ts` (prevents emulator config in staging/prod) |
