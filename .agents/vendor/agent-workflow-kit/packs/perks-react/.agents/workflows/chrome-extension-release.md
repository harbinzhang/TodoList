---
description: How to prepare and publish the Perkmon Chrome extension through Chrome Web Store
---

# Chrome Extension Release Workflow

## Prerequisites

- Explicit user approval before any Web Store upload or publish command.
- `apps/chrome-extension/.env.production` exists locally with production Firebase and Functions values.
- `apps/chrome-extension/.env.production` is ignored by git but is a real release dependency. Inspect it directly before every production build.
- Chrome Web Store service-account auth is configured for real publish commands.
- Listing assets, when needed, live outside the zip under `/Users/haibinzhang/Desktop/perkmon-chrome-store-assets/`.
- `$chrome-extension-provider-replay` is the safety reference for provider mock/raw replay, raw capture boundaries, and local-only profile handling before upload.

## Hard Stops

Stop and report blockers before upload/publish if any of these fail:

- Web Store status cannot be checked and the user has not explicitly accepted proceeding without live status.
- `manifest.json`, `package.json`, and `package-lock.json` versions disagree.
- Candidate version is not greater than the currently published Web Store version.
- `npm run webstore:sensitive-gate` detects any non-version difference from `apps/chrome-extension/release-sensitive-baseline.json`.
- Source, built, or packaged manifests differ from the approved sensitive baseline. `webstore:package` and `webstore:publish` enforce this independently.
- `apps/chrome-extension/.env.production` points at staging or mixes staging/prod values.
- `apps/chrome-extension/.env.production` uses a Google OAuth client that is not the production Chrome extension client.
- The built `dist/` contains any staging Firebase project id, staging Function URL, staging API key, or staging Google OAuth client.
- Apple sign-in is in release scope but production extension auth functions/secrets/env are not deployed/configured.
- `npm run release:webstore:dry-run` fails.
- The provider replay safe gate has not passed before upload. At minimum, run the provider manifest validation, provider capture dry-run, fixture safety check, and provider mock replay listed in "Run Provider Replay Safe Gate" below.
- Provider replay produces or depends on tracked raw captures, tracked Chrome profiles, token-bearing logs, screenshots, videos, or traces containing real provider/account data.
- A release-impacting provider, fanout/add/enroll, matching, or merchant-alert change lacks replay coverage and the user has not explicitly accepted proceeding with that documented coverage gap.
- Production `dist/manifest.json` contains `http://localhost/*`.
- Production `dist/manifest.json` is missing `<all_urls>` in `host_permissions` (broad site access is intentional — see "Broad Host Access" below).
- Generated zip is missing `manifest.json`, `background.js`, `sidepanel.html`, or required icons.
- The package was submitted for review before the Chrome Web Store Dashboard Privacy Practices / permission justification for broad host access was reviewed by the user.

## Mandatory Sensitive-Change Hard Stop

Run from `apps/chrome-extension` before build, package, upload, or publish:

```bash
npm run webstore:sensitive-gate
```

`release-sensitive-baseline.json` is the reviewed security-surface contract.
The executable gate compares every manifest field except `version` and
`version_name`; permission arrays are treated as unordered sets. It therefore
hard-stops changes to permissions/hosts and to all other current or future
manifest surfaces, including CSP, background execution, content scripts,
externally connectable origins, web-accessible resources, OAuth/signing
identity, actions, side panel, commands, descriptions, and icons.

This is defense in depth:

- `release:webstore` and `release:webstore:dry-run` run the gate before other work.
- `webstore:package` checks the built manifest.
- `webstore:publish` checks the manifest inside the exact zip before obtaining a token or making an upload call.

On `HARD STOP`, do not upload or submit, and do not add a bypass flag. Generic
release approval does not approve the sensitive delta. Report the exact changed
fields and start a separate security/privacy review. Update
`release-sensitive-baseline.json` only in a dedicated reviewed change with
explicit human approval naming those differences and any required Web Store
disclosure updates; then begin a new release attempt.

## Broad Host Access (Intentional)

The release manifest requests broad site access (`<all_urls>` in
`host_permissions`) for Chrome Web Store declaration parity with comparable
extensions (e.g. NextCard) that declare "read and change data on all websites".
This is a deliberate posture, not a leak:

- Runtime navigation and content injection remain provider-gated by
  `PROVIDERS[*].hostMatches` and the platform-layer host checks. The broad grant
  is a Web Store declaration; it does NOT change which origins the extension
  actually drives at runtime.
- Each provider origin stays declared explicitly in `optional_host_permissions`
  for provider review and sync-time gating.
- **Manual Dashboard step (post-upload):** after uploading the new package, the
  Chrome Web Store Dashboard → Privacy Practices / permission justification must
  declare WHY the extension needs access to all URLs. **Do NOT submit for review
  until the user has reviewed that Dashboard declaration.**

## 1. Inspect Current State

From repo root:

```bash
git status --short
sed -n '1,220p' apps/chrome-extension/package.json
sed -n '1,220p' apps/chrome-extension/manifest.json
```

Treat existing dirty changes as release scope unless the user says otherwise. Do not revert unrelated changes.

From `apps/chrome-extension`, query live Web Store status:

```bash
npm run webstore:status
```

Record the observed `publishedItemRevisionStatus.distributionChannels[].crxVersion`.
Also run `npm run webstore:sensitive-gate` and record the approved baseline
version before continuing.

## 2. Verify Production Extension Env

The extension release env is ignored by git, so do not infer it from source
files or previous assistant text. Read it directly:

```bash
sed -n '1,120p' apps/chrome-extension/.env.production
```

Expected production values:

```env
VITE_FIREBASE_PROJECT_ID=perks-react
VITE_FUNCTIONS_BASE_URL=https://us-central1-perks-react.cloudfunctions.net
VITE_GOOGLE_OAUTH_CLIENT_ID=1000114568410-lgb07ltc2i2pjmjtnac5nr15c8ctkgab.apps.googleusercontent.com
VITE_EXTENSION_AUTH_START_URL=https://us-central1-perks-react.cloudfunctions.net/startExtensionAppleAuth
```

Use the production Firebase Web API key from root `.env.production`:

```bash
node -e "const fs=require('fs'); const parse=p=>Object.fromEntries(fs.readFileSync(p,'utf8').split(/\n/).filter(Boolean).map(l=>l.split(/=(.*)/s).slice(0,2))); const root=parse('.env.production'); const ext=parse('apps/chrome-extension/.env.production'); const expected={VITE_FIREBASE_API_KEY:root.VITE_FIREBASE_API_KEY,VITE_FIREBASE_PROJECT_ID:'perks-react',VITE_FUNCTIONS_BASE_URL:'https://us-central1-perks-react.cloudfunctions.net',VITE_GOOGLE_OAUTH_CLIENT_ID:'1000114568410-lgb07ltc2i2pjmjtnac5nr15c8ctkgab.apps.googleusercontent.com',VITE_EXTENSION_AUTH_START_URL:'https://us-central1-perks-react.cloudfunctions.net/startExtensionAppleAuth'}; const bad=Object.entries(expected).filter(([k,v])=>ext[k]!==v); if (bad.length) { console.error(Object.fromEntries(bad.map(([k,v])=>[k,{expected:v,actual:ext[k]}]))); process.exit(1) } console.log('extension prod env ok')"
```

Never use these staging values in a production extension build:

```text
perkly-staging-7dab8
https://us-central1-perkly-staging-7dab8.cloudfunctions.net
470764116554-6m53s9tkg8pho9eeq318hu2v8vbch3sh.apps.googleusercontent.com
```

The Google OAuth client matters independently from Firebase project id. A wrong
client id can still build successfully but fail at runtime with:

```text
Error 400: redirect_uri_mismatch
```

When in doubt, compare historical release zip values before changing the client:

```bash
for z in apps/chrome-extension/releases/perkmon-chrome-extension-v*.zip; do
  echo "--- $z"
  unzip -Z1 "$z" | rg '\.js$' | while read f; do unzip -p "$z" "$f"; done |
    rg -o '[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com|perks-react|perkly-staging-7dab8|us-central1-[a-z0-9-]+\.cloudfunctions\.net' |
    sort -u
done
```

## 3. Verify Production Apple Auth Readiness When In Scope

Apple sign-in uses the production extension auth bridge. Before claiming
production readiness, verify the production backend prerequisites:

```bash
rg '^(APPLE_SIGN_IN_SERVICE_ID|APPLE_SIGN_IN_TEAM_ID|APPLE_SIGN_IN_KEY_ID|APPLE_SIGN_IN_CALLBACK_URL|EXTENSION_AUTH_ALLOWED_REDIRECT_ORIGINS|IDENTITY_TOOLKIT_API_KEY)=' functions/.env.perks-react
gcloud secrets describe APPLE_SIGN_IN_PRIVATE_KEY --project=perks-react --format='value(name)'
gcloud secrets describe EXTENSION_AUTH_STATE_SECRET --project=perks-react --format='value(name)'
gcloud functions describe startExtensionAppleAuth --gen2 --region=us-central1 --project=perks-react --format='value(name)' 2>/dev/null || true
gcloud functions describe completeExtensionAppleAuth --gen2 --region=us-central1 --project=perks-react --format='value(name)' 2>/dev/null || true
```

Expected production Apple values:

```text
APPLE_SIGN_IN_SERVICE_ID=com.perkly.service
APPLE_SIGN_IN_TEAM_ID=LDSKG753K8
APPLE_SIGN_IN_KEY_ID=XGUVMR3C88
APPLE_SIGN_IN_CALLBACK_URL=https://perkmon.app/extension-auth/apple/callback
EXTENSION_AUTH_ALLOWED_REDIRECT_ORIGINS=https://lellgecamdabpbppjgdkfeljfhfipecd.chromiumapp.org
IDENTITY_TOOLKIT_API_KEY=<root prod VITE_FIREBASE_API_KEY>
```

Manual Apple Developer requirement:

```text
Service ID com.perkly.service must include:
https://perkmon.app/extension-auth/apple/callback
```

Production Firebase deploy is a separate action from Chrome Web Store release.
Do not deploy Functions or Hosting rewrites unless the user explicitly approves
that deploy.

## 4. Choose And Apply Version

If the user did not specify a version, choose the next patch version above the highest of:

- `apps/chrome-extension/package.json` version
- `apps/chrome-extension/manifest.json` version
- the Web Store published `crxVersion`

Apply the version from `apps/chrome-extension`:

```bash
npm pkg set version=<next-version>
node -e "const fs=require('fs'); const version=require('./package.json').version; const path='manifest.json'; const manifest=JSON.parse(fs.readFileSync(path,'utf8')); manifest.version=version; fs.writeFileSync(path, JSON.stringify(manifest, null, 2)+'\n')"
npm install --package-lock-only
```

Verify consistency:

```bash
node -e "const pkg=require('./package.json'); const lock=require('./package-lock.json'); const manifest=require('./manifest.json'); const lockRoot=lock.packages && lock.packages[''] && lock.packages[''].version; if (pkg.version!==manifest.version || pkg.version!==lock.version || pkg.version!==lockRoot) { console.error({pkg:pkg.version, manifest:manifest.version, lock:lock.version, lockRoot}); process.exit(1) } console.log(pkg.version)"
```

## 5. Run Local Release Gate

From `apps/chrome-extension`:

```bash
npm run release:webstore:dry-run
```

This runs the sensitive-change hard stop, typecheck, tests, production build,
zip packaging, then invokes `publish-webstore --dry-run`, which rechecks the
packaged manifest and skips token, upload, publish, and status calls.

## 6. Verify Built Artifact

After a successful dry-run:

```bash
node -e "const m=require('./dist/manifest.json'); const hp=m.host_permissions||[]; if (hp.includes('http://localhost/*')) process.exit(1); if (!hp.includes('<all_urls>')) { console.error('missing <all_urls> in host_permissions'); process.exit(1) } console.log(JSON.stringify({version:m.version, host_permissions:m.host_permissions, icons:m.icons, action:m.action}, null, 2))"
VERSION="$(node -p 'require("./package.json").version')"
unzip -l "releases/perkmon-chrome-extension-v${VERSION}.zip"
rg 'perkly-staging-7dab8|us-central1-perkly-staging-7dab8|470764116554-6m53s9tkg8pho9eeq318hu2v8vbch3sh' dist && exit 1 || true
rg '1000114568410-lgb07ltc2i2pjmjtnac5nr15c8ctkgab|us-central1-perks-react.cloudfunctions.net|perks-react' dist
```

Confirm the zip includes:

- `manifest.json`
- `background.js`
- `sidepanel.html`
- `icons/icon-16.png`
- `icons/icon-32.png`
- `icons/icon-48.png`
- `icons/icon-128.png`

## 7. Run Provider Replay Safe Gate

Before any Web Store upload command, invoke `$chrome-extension-provider-replay`
and run the safe local replay gate from the repo root. This gate must not ask
for provider credentials, automate MFA, operate a live provider session, or
promote raw captures. Use committed sanitized fixtures and isolated test
profiles first.

Baseline gate:

```bash
git ls-files tmp/provider-recordings tmp/chrome-extension-profiles
npm run record:extension:providers:validate
node e2e/extension/record-providers-capture.mjs --dry-run --providers all
npm run test:e2e:extension:provider:fixtures
npm run test:e2e:extension:provider:mock
git status --short tmp/provider-recordings tmp/chrome-extension-profiles e2e/extension/fixtures/providers
```

The `git ls-files tmp/provider-recordings tmp/chrome-extension-profiles` output
must be empty. `tmp/provider-recordings/**` and `tmp/chrome-extension-profiles/**`
must remain untracked after the gate. Do not paste raw HTML/API bodies or
token-bearing logs into the release report.

Run targeted replay in addition to the baseline gate when the release diff
touches a provider extractor, provider registry/capability settings,
sync/matching/reconciliation, fanout/add/enroll behavior, injected provider UI,
or merchant alerts:

```bash
npm run test:e2e:extension:amex:replay        # Amex surface changes
npm run test:e2e:extension:merchant-alert     # Merchant alert/reminder changes
```

For providers without a committed fixture lane that covers the release-impacting
surface, use the raw replay path only with existing gitignored captures under
`tmp/provider-recordings/raw/<provider>/<scenario>/`:

```bash
PROVIDER_REPLAY_RAW_ROOT=tmp/provider-recordings/raw/<provider>/<scenario> \
  npm run dev:extension:provider:raw -- --provider <provider>
```

Raw replay is a validation tool, not an upload artifact. Hard stop if the raw
capture is incomplete, the run needs a live provider login that has not already
been completed by the user under `$chrome-extension-provider-replay` safety
rules, or temporary profiles/test outputs cannot be deleted or kept untracked.

If replay coverage is unavailable for a release-impacting provider change,
report the exact missing provider/scenario/artifact and get explicit user
approval before proceeding to upload.

## 8. Check Listing Assets When Relevant

Listing assets are not included in the extension zip. If the user is preparing store listing updates, verify dimensions:

```bash
sips -g pixelWidth -g pixelHeight \
  /Users/haibinzhang/Desktop/perkmon-chrome-store-assets/screenshots/*.png \
  /Users/haibinzhang/Desktop/perkmon-chrome-store-assets/store-icon-128.png \
  /Users/haibinzhang/Desktop/perkmon-chrome-store-assets/small-promo-440x280.png
```

Expected:

- screenshots: `1280x800`
- store icon: `128x128`
- small promo: `440x280`

## 9. Publish Only After Explicit Approval

Because the manifest now requests broad host access (`<all_urls>`), there is an
extra manual gate between upload and review submission:

1. Confirm the provider replay safe gate has passed, or that the user explicitly accepted a documented coverage gap.
2. Upload the package (e.g. `--upload-only`).
3. In the Chrome Web Store Dashboard, update **Privacy Practices / permission
   justification** to declare why the extension needs access to all URLs.
4. Have the user review that Dashboard declaration.
5. Only then submit for review.

Only after the user explicitly approves Web Store upload/review submission, run:

```bash
npm run release:webstore
```

This performs the same local gates, uploads the zip, submits the publish request, and fetches final status.

Useful lower-risk variants:

```bash
npm run webstore:publish -- --zip releases/perkmon-chrome-extension-v<version>.zip --upload-only
npm run webstore:publish -- --publish-type STAGED_PUBLISH
npm run webstore:publish -- --deploy-percentage 25
```

## 10. Report

Include:

- mode: prepare-only, upload-only, staged publish, or full publish
- Web Store item id
- current published version and candidate version
- extension production env status, including Google OAuth client id and Apple start URL
- Apple auth backend/deploy status when Apple sign-in is in scope
- exact commands run and pass/fail result
- sensitive-change gate result, approved baseline version, and exact changed fields when blocked
- provider replay safe gate result, including baseline commands, targeted providers/scenarios when applicable, and whether raw data/profiles stayed untracked under `tmp`
- zip path and size
- `dist/manifest.json` host permission check (including `<all_urls>` present, `http://localhost/*` absent)
- `dist/` staging-reference scan result
- listing asset status when checked
- broad-host-access Privacy Practices declaration status (manual Dashboard step; pending user review before review submission)
- final Web Store status if published
