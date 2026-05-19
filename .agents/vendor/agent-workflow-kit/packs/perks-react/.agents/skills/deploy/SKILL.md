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
3. Run the relevant pre-deploy checks for the selected scope.
4. If checks are clean, execute the selected deploy path from the workflow doc.
5. Preserve the canonical staging host setup from the workflow doc:
   - `perkmon-staging.web.app` is the live staging app
   - `perkly-staging-7dab8.web.app` is a Hosting-only redirect site and should be deployed alongside staging hosting changes
6. Treat card-asset hosting as explicit-only:
   - Do not deploy `perkmon-staging-card-assets.web.app` during full or hosting-only deploys.
   - Deploy card assets only when the user explicitly asks for card assets or card art changed.
7. For staging `full` and `hosting` deploys, rely on `scripts/deploy-firebase.sh` to auto-run strict `staging-qa` against the built `sw-build-meta.js` identity unless the user explicitly asks to skip post-deploy QA.
8. For staging scopes that do not auto-run QA (`functions`, `rules`, `storage`, `card-assets`, `admin`) or when troubleshooting, run the appropriate post-deploy validation manually from the workflow doc.
9. Report:
   - what target was deployed
   - what checks were run
   - whether post-deploy verification was auto-run strict QA or a manual follow-up check

## Outputs

- Deployment target summary
- Commands executed
- Verification status and any follow-up issues
