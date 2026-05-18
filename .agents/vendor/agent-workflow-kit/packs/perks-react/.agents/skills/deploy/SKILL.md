---
name: deploy
description: Deploy the application to Firebase using the shared deploy workflow
---

# Deploy Skill

Canonical workflow doc: `.agents/workflows/deploy.md`

Use this skill when the user asks to deploy web hosting, card-asset hosting, functions, Firestore rules, or Storage rules.

## Safety

- Only this `/deploy` skill may run production deploy commands.
- Production deploys require explicit user acknowledgement of the production target before any production deploy command runs.
- Check `.agents/conventions.md` for production safety rules before proceeding.
- Hard stop policy: if any pre-deploy check fails or an unusual failure appears (for example E2E failure, Firestore rules warning/error, auth or environment mismatch), do not run deploy commands. Report blockers first and wait for user direction.
- Firestore index rollout gate: if the deploy includes new or changed Firestore queries that require a new composite index, collection-group single-field index, or `firestore.indexes.json` change, do not deploy the dependent Hosting or Functions code until indexes have been deployed first and confirmed ready. New code going live while an index is still building is a production blocker, even if the Firebase deploy command has not finished.
- A full production deploy is not complete until every requested surface is verified. If a full deploy fails partway and a later retry deploys only one surface, report only that surface as complete unless all originally requested surfaces are reverified.
- Hosting health must be proven by the live build marker, not by HTTP 200 alone. For production `full` or `hosting` deploys, verify the live `/sw-build-meta.js` marker matches the just-built `dist/sw-build-meta.js` on the production entrypoints.

## Execution

1. Load `.agents/workflows/deploy.md`.
2. Choose the matching path:
   - Full deploy
   - Hosting only
   - Card-asset hosting only
   - Functions only
   - Specific function
   - Firestore rules only
   - Storage rules only
3. Before any deploy that can expose new code, classify whether this release is index-dependent:
   - `firestore.indexes.json` changed
   - query shape changed in frontend, Functions, monitoring, or admin paths
   - a Firestore error or review note mentions `FAILED_PRECONDITION`, "query requires an index", collection-group query support, or a new compound `where`/`orderBy`
4. If the release is index-dependent, follow the workflow doc's Firestore index predeploy gate before deploying dependent Hosting or Functions code.
5. Run the relevant pre-deploy checks for the selected scope.
6. If checks are clean and any required index predeploy gate is complete, execute the selected deploy path from the workflow doc.
7. Preserve the canonical staging host setup from the workflow doc:
   - `perkmon-staging.web.app` is the live staging app
   - `perkly-staging-7dab8.web.app` is a Hosting-only redirect site and should be deployed alongside staging hosting changes
8. Treat card-asset hosting as explicit-only:
   - Do not deploy `perkmon-staging-card-assets.web.app` during full or hosting-only deploys.
   - Deploy card assets only when the user explicitly asks for card assets or card art changed.
9. For staging `full` and `hosting` deploys, rely on `scripts/deploy-firebase.sh` to auto-run strict `staging-qa` against the built `sw-build-meta.js` identity unless the user explicitly asks to skip post-deploy QA.
10. For staging Functions deploys, confirm browser-callable Functions pass the callable access smoke (`npm run staging:qa:callables` or the deploy script's automatic equivalent) so Cloud Run/IAM 403s cannot hide behind a green deploy.
11. For production `full` and `hosting` deploys, confirm the deploy script's production Hosting marker verification passes. If troubleshooting manually, compare `dist/sw-build-meta.js` with all production web entrypoints:
   - `https://perks-react.web.app/sw-build-meta.js`
   - `https://perks-react.firebaseapp.com/sw-build-meta.js`
   - `https://perkmon.app/sw-build-meta.js`
12. For staging scopes that do not auto-run QA (`functions`, `rules`, `storage`, `card-assets`, `admin`) or when troubleshooting, run the appropriate post-deploy validation manually from the workflow doc.
13. Report:
   - what target was deployed
   - every requested surface and whether it was verified (`Hosting`, `Functions`, `Firestore rules`, `Firestore indexes`, `Storage rules`, and card assets when explicit)
   - what checks were run
   - whether the Firestore index predeploy gate was not applicable, completed, or blocked
   - whether post-deploy verification was auto-run strict QA or a manual follow-up check
   - for Hosting deploys, the live `appVersion` and `buildId` from `/sw-build-meta.js`

## Outputs

- Deployment target summary
- Commands executed
- Verification status and any follow-up issues
