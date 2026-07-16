---
name: chrome-extension-release
description: Prepare and publish the Perkmon Chrome extension through Chrome Web Store, including the provider replay safe gate before upload. Use when the user asks to release, publish, upload, submit, package, dry-run, bump, or check status for `apps/chrome-extension`, Chrome Web Store, Web Store listing assets, `release:webstore`, `webstore:status`, `webstore:package`, or `publish-webstore`.
---

# Chrome Extension Release Skill

Canonical workflow doc: `.agents/workflows/chrome-extension-release.md`

Use this skill for Chrome Web Store release work for `apps/chrome-extension`.
This is separate from the repo `release`, `ship`, and Firebase `deploy` skills.

## Safety

- Require explicit user approval before any command that uploads or publishes to Chrome Web Store.
- `npm run release:webstore:dry-run` is allowed for preparation; it skips token, upload, publish, and status API calls after the local gate.
- Always query Web Store status before choosing the next version.
- Always bump `manifest.json`, `package.json`, and `package-lock.json` together when preparing a new upload.
- Before every production build or package, verify `apps/chrome-extension/.env.production` is a single-environment prod config. It must not mix staging Firebase/Functions/Google OAuth values with production values.
- For Google sign-in, do not invent or substitute OAuth clients. The known production Chrome extension Google OAuth client is `1000114568410-lgb07ltc2i2pjmjtnac5nr15c8ctkgab.apps.googleusercontent.com`; stale staging client ids such as `470764116554-...` cause `redirect_uri_mismatch`.
- For Apple sign-in, verify the production extension auth backend is deployed/configured before claiming the production extension is ready.
- Hard stop if typecheck, tests, production build, packaging, manifest validation, or version consistency fails.
- Hard stop if the built `dist/` contains staging project ids, staging Function URLs, staging Firebase API keys, or staging Google OAuth clients.
- Before any Chrome Web Store upload command, run the `$chrome-extension-provider-replay` safe gate from the canonical workflow. At minimum this includes provider recording manifest validation, provider capture dry-run, fixture safety check, and provider mock replay.
- Hard stop if provider replay fails, needs live provider credentials/MFA handled by the agent, produces tracked raw captures or Chrome profiles, or leaves a release-impacting provider/fanout/add/enroll/matching/merchant-alert change without replay coverage unless the user explicitly accepts the documented coverage gap.
- Do not treat listing screenshots on Desktop as part of the extension zip; report them as separate Chrome Web Store listing assets.
- **Broad host access is now intentional.** The manifest requests broad site access (`<all_urls>` in `host_permissions`) for Chrome Web Store declaration parity with comparable extensions. Runtime navigation/injection stays provider-gated by `PROVIDERS[*].hostMatches` and platform checks — the broad grant is declaration only.
- **Privacy Practices declaration is a manual post-upload step.** After uploading the new package, the Chrome Web Store Dashboard → Privacy Practices / permission justification must declare why the extension needs access to all URLs. Do NOT submit for review until the user has reviewed that Dashboard declaration.

## Execution

1. Load `.agents/workflows/chrome-extension-release.md`.
2. Determine intent:
   - **Prepare only**: status, version bump, dry-run gate, package, provider replay safe gate when preparing an upload, and listing asset checks.
   - **Publish**: all prepare steps plus actual `npm run release:webstore`, only after explicit approval.
   - **Prod auth readiness**: extension prod env, Google OAuth client, Apple auth Function/Hosting deploy prerequisites, without Web Store upload unless explicitly approved.
3. Work from `apps/chrome-extension` for package commands.
4. Report:
   - current Web Store version
   - chosen next version and files bumped
   - production env/auth validation result, including Google OAuth client and Apple auth start URL
   - dry-run gate result
   - provider replay safe gate result, including baseline commands, targeted provider/scenario coverage when applicable, and confirmation that raw data/profiles stayed untracked under `tmp`
   - generated zip path and size
   - listing asset paths/dimensions when relevant
   - publish/review status if an upload was actually submitted

## Outputs

- Release mode: prepare-only or publish
- Web Store item id and observed current version
- Version bump summary
- Production extension auth/env summary
- Verification commands and results
- Provider replay safe gate result
- Zip artifact path
- Blockers or manual Chrome Web Store Dashboard steps
