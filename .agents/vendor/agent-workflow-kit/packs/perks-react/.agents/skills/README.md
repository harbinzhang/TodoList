# Skills

This directory contains agent-executable skills for the perks-react project.

Canonical registry: `.agents/catalog.yaml`

## Maintenance Rules

- `.agents/catalog.yaml` is the source of truth for which skills and workflows exist.
- In this pack snapshot, skill entries resolve to pack-local `.agents/skills/` files so the pack can be copied as a self-contained starting point.
- Each skill `SKILL.md` is the source of truth for when that skill should be used, what safety rules apply, and which workflow to load.
- Each file in `.agents/workflows/` is the source of truth for the operational procedure: prerequisites, checks, commands, verification, and reporting.
- Agent-specific wrappers should stay thin and refer back to these canonical docs instead of copying instructions.
- When behavior changes, update the canonical skill or workflow first, then sync `catalog.yaml`, this README, and any agent-specific adapters.
- Do not create placeholder docs that only point to themselves. If a file says it is an adapter, it should point to a different canonical doc that contains the real instructions.

## Available Skills

| Skill | Description | Entry Point |
|---|---|---|
| `ship` | Staging-first patch ship: validate the exact tagged candidate, promote it to `main`, publish Latest, and reconcile ship-created support fixes to `dev` through a minimal PR | `.agents/skills/ship/SKILL.md` |
| `shipc` | Full fixed `release-branch` patch ship matching `ship`, with automated test suites explicitly skipped and retained deploy/live-outcome safety checks | `.agents/skills/shipc/SKILL.md` |
| `i18n-staging-sync` | Fix pre-staging i18n gate blockers for missing, stale, or structurally invalid locale catalogs before deploy | `.agents/skills/i18n-staging-sync/SKILL.md` |
| `deploy` | Deploy or recover immutable Firebase surfaces with production baselining, surface-sequenced full rollouts, exact Function reconciliation, marker/digest guards, and target-specific rebuilds | `.agents/skills/deploy/SKILL.md` |
| `prod-deploy` | Prepare a production deploy readiness report by resolving the live production version and classifying changes since prod into automatic and manual verification | `.agents/skills/prod-deploy/SKILL.md` |
| `release` | Prepare either a direct main-first branch release or the ship-only staging-first tagged-candidate and post-staging main-promotion flow | `.agents/skills/release/SKILL.md` |
| `hotfix` | Prepare a short-lived production hotfix from a released tag, optionally cherry-pick reviewed commits, run patch release verification, feed the fix through main, and clean up the hotfix branch/worktree | `.agents/skills/hotfix/SKILL.md` |
| `feature` | Manage the full feature lifecycle in a dedicated git worktree and branch created from the current branch tip, with plan, design, and finish gates, PR squash merge to main, and post-merge branch/worktree cleanup | `.agents/skills/feature/SKILL.md` |
| `rebase` | Create a fresh branch in the current worktree, then hard-reset it to origin/dev6 by default or a named remote branch, discarding all uncommitted local tracked and untracked changes without a second confirmation prompt | `.agents/skills/rebase/SKILL.md` |
| `ios-release` | Build and upload iOS app to App Store Connect / TestFlight with version syncing plus fail-fast dSYM validation, preservation, Crashlytics upload, and UUID-based recovery | `.agents/skills/ios-release/SKILL.md` |
| `firestore` | Inspect or modify Firestore data using the shared Firestore workflow and project conventions | `.agents/skills/firestore/SKILL.md` |
| `monitor` | Run lifecycle-aware production health sweeps (observing/enforcing monitors via monitor-manifest.json), analyze unexpected Firestore signals, and commit the resulting monitoring/ledger/ diff | `.agents/skills/monitor/SKILL.md` |
| `benefit-drift-audit` | Run the read-only benefit-tracking drift audit, or use the aggregate user-level tracking wrapper for one-user investigations | `.agents/skills/benefit-drift-audit/SKILL.md` |
| `suggestion-approval-tracking-audit` | Audit the read-only catalog and userCardBenefitsTracking effects of one approved card update suggestion, staging first and production only with explicit authorization | `.agents/skills/suggestion-approval-tracking-audit/SKILL.md` |
| `suggestion-approval-ops` | Run the gated end-to-end card suggestion lifecycle across Staging and Production with exact-one audits and resumable artifacts | `.agents/skills/suggestion-approval-ops/SKILL.md` |
| `email-campaign-ops` | Prepare and operate Perkmon email campaigns, including unified campaign drafts, template updates, test sends, unsubscribe filtering, audience preview, legacy benefit-reminder handling, and final send safety checks | `.agents/skills/email-campaign-ops/SKILL.md` |
| `prepare-agent-handoff` | Turn prior context into a concise prompt for another agent while preserving goal, gain, scope, risks, and room for design discussion | `.agents/skills/prepare-agent-handoff/SKILL.md` |
| `roadmap` | Operate the agent roadmap under `docs/roadmap/` — show current epic / big-feature state, collect and triage candidate backlogs against current repo and GitHub evidence, reuse existing epics before proposing a new one, regenerate the derived progress dashboard, check for drift, capture ideas, add or advance a track, or turn a plan into a tracked mission | `.agents/skills/roadmap/SKILL.md` |
| `generate-card-update-suggestion` | Research the latest public benefits for an existing card and prepare or create a pending admin review suggestion | `.agents/skills/generate-card-update-suggestion/SKILL.md` |
| `add-card` | Deduplicate in Staging, generate one canonical card JSON, ship it through the script-only uploader, and reuse the same artifact for authorized Production promotion | `.agents/skills/add-card/SKILL.md` |
| `weekly-offer-candidates` | Find and rank high-value weekly offer candidates for consumer emails and offers-to-check blocks | `.agents/skills/weekly-offer-candidates/SKILL.md` |
| `local-emulator-admin-setup` | Start or seed local Firebase emulators with an admin test account, real card products, and a local-safe all-features operational flag profile for agent testing | `.agents/skills/local-emulator-admin-setup/SKILL.md` |
| `re` | Review current-branch git changes in the active worktree for bugs, conventions compliance, code quality, and Cloud Functions entrypoint test parity (matrix sync + high-risk helper coverage) | `.agents/skills/re/SKILL.md` |
| `firebase-functions-best-practices` | Audit, design, implement, or refactor Node.js Cloud Functions for Firebase across callable security, Firestore I/O, async waterfalls, cold starts, retries, scaling, observability, load testing, and cost | `.agents/skills/firebase-functions-best-practices/SKILL.md` |
| `pr-coding-loop` | Create and maintain implementation PRs from coding-agent worktrees using upstream-derived PR bases and the shared PR agent comment protocol | `.agents/skills/pr-coding-loop/SKILL.md` |
| `pcl` | Alias for `pr-coding-loop` | `.agents/skills/pcl/SKILL.md` |
| `adversarial-review` | Independently challenge an exact code change for evidence-backed merge blockers without modifying it | `.agents/skills/adversarial-review/SKILL.md` |
| `codex-relay` | Plan → human confirm → sequential Codex task execution with checkpoint commits → lightweight PALL exact-SHA adversarial PR gate | `.agents/skills/codex-relay/SKILL.md` |
| `cr` | Alias for `codex-relay` | `.agents/skills/cr/SKILL.md` |
| `crc` | Bounded compact grilling → one confirmation → as many small Codex tasks as the goal needs → lightweight exact-SHA adversarial PR gate | `.agents/skills/crc/SKILL.md` |
| `cc` | Bounded compact grilling → one confirmation → ordered native Codex collaboration tasks → lightweight exact-SHA adversarial PR gate | `.agents/skills/cc/SKILL.md` |
| `multi-cc` | Plan one multi-PR mission → confirm once → sequential native Codex implementation and exact-SHA merge per PR → roadmap closure | `.agents/skills/multi-cc/SKILL.md` |
| `mcc` | Alias for `multi-cc` | `.agents/skills/mcc/SKILL.md` |
| `pr-adversarial-loop` | Carry the current implementation branch or an existing PR through adversarial review, fixes, full verification, and merge | `.agents/skills/pr-adversarial-loop/SKILL.md` |
| `pal` | Alias for `pr-adversarial-loop` | `.agents/skills/pal/SKILL.md` |
| `pall` | Run a lightweight event-driven adversarial PR loop with risk-tiered verification for each exact head SHA | `.agents/skills/pall/SKILL.md` |
| `pr-review-loop` | Review every latest PR head through a fresh adversarial pass using the bounded agent comment loop, Chinese human summaries, and SHA-bound GOOD_TO_GO signals | `.agents/skills/pr-review-loop/SKILL.md` |
| `pr-retro-audit` | Audit recent, open, merged, or closed PRs for missed critical issues, stale approvals, review-comment quality, and post-merge follow-up gaps | `.agents/skills/pr-retro-audit/SKILL.md` |
| `prl` | Alias for `pr-review-loop` | `.agents/skills/prl/SKILL.md` |
| `reviewl` | Alias for `pr-review-loop`, matching review-loop slash-command search terms | `.agents/skills/reviewl/SKILL.md` |
| `gha-monitor` | Check recent GitHub Actions workflow runs and surface failures or anomalies | `.agents/skills/gha-monitor/SKILL.md` |
| `android-release` | Prepare and ship one exact tagged Android source through the exclusive local runner, verify Open testing availability, safely resume Production review submission, and keep Production publishing manual by default | `.agents/skills/android-release/SKILL.md` |
| `chrome-extension-release` | Prepare and publish the Perkmon Chrome extension through Chrome Web Store, with a manifest sensitive-change hard stop, prod env/auth validation, live version checks, dry-run, provider replay before upload, zip verification, and explicit approval before upload | `.agents/skills/chrome-extension-release/SKILL.md` |
| `chrome-extension-provider-replay` | Record and replay Chrome extension provider flows using local raw captures or committed sanitized fixtures, while keeping issuer raw data and browser profiles out of Git | `.agents/skills/chrome-extension-provider-replay/SKILL.md` |
| `android-screenshots` | Capture and upload Play Store screenshots for phone, 7-inch, and 10-inch tablets | `.agents/skills/android-screenshots/SKILL.md` |
| `marketing-recordings` | Capture, regenerate, verify, and promote Perkmon marketing screenshots and user-journey videos from staging or approved synthetic demo scenes | `.agents/skills/marketing-recordings/SKILL.md` |
| `monthly-report` | Draft board-ready monthly reports, community updates, product snapshots, or operational summaries | `.agents/skills/monthly-report/SKILL.md` |
| `seo-geo-audit` | Audit website SEO and GEO readiness across public surfaces, metadata, crawlability, structured data, rendering strategy, and AI citation readiness | `.agents/skills/seo-geo-audit/SKILL.md` |
| `test-coverage-report` | Report current unit, contract, integration, and e2e test coverage surfaces and the highest-value gaps | `.agents/skills/test-coverage-report/SKILL.md` |
| `test-quality-audit` | Assess whether tests provide behavioral confidence across trigger, boundary, side effect, reader, and edge-case coverage | `.agents/skills/test-quality-audit/SKILL.md` |
| `tdd` | Drive feature work or bug fixes using a Red-Green-Refactor test-driven development cycle | `.agents/skills/tdd/SKILL.md` |
| `verify` | Run all test suites (unit, TypeScript, build, E2E, Firestore rules) and report a pass/fail summary | `.agents/skills/verify/SKILL.md` |
| `staging-tracker-verification` | Verify production-derived staging tracker rows, used-state persistence, durable interruption recovery, trigger-owned cleanup, and exact card/tracking/profile restoration | `.agents/skills/staging-tracker-verification/SKILL.md` |
| `staging-qa` | Run the fast post-deploy staging QA gate across remote E2E, Firebase Auth/Firestore health, Hosting build metadata, and stale test-data cleanup, with health-only default build checks and optional strict expected-build verification | `.agents/skills/staging-qa/SKILL.md` |
| `staging-user-journey-verification` | Verify core hosted-staging user journeys with read-only smoke, staging-safe writes, direct Firestore inspection, and cleanup | `.agents/skills/staging-user-journey-verification/SKILL.md` |
| `staging-diff-verification` | Verify deploy-relevant diffs on hosted staging by reusing deploy QA, doing targeted browser or Firestore checks, and exercising staging-safe user writes with readback and cleanup | `.agents/skills/staging-diff-verification/SKILL.md` |
| `native-staging-verification` | Verify iOS and Android staging native shells on local simulators with authorized login, explicit device binding, trustworthy evidence, and credential-safe cleanup | `.agents/skills/native-staging-verification/SKILL.md` |
| `refactor-safety` | Prove an N/M-series consolidation refactor is behavior-preserving before merge — mechanical stale-vendor/orphaned-duplicate/parity-test gate plus a required behavior-preservation proof and drift-canary checklist | `.agents/skills/refactor-safety/SKILL.md` |
| `add-high-quality-tests` | Add or strengthen TypeScript, React, Firebase, Vitest, or Playwright tests for existing behavior — coverage backfills, mock-heavy suites, flaky async flows, or suspicious green tests | `.agents/skills/add-high-quality-tests/SKILL.md` |

Agent-specific command wrappers should stay thin and point back to these canonical skill docs instead of duplicating them.

## Available Workflows

| Workflow | Purpose | Entry Point |
|---|---|---|
| `codex-collaboration-core` | Execute confirmed tasks sequentially through native Codex collaboration agents, checkpoint them, update roadmap state, and finish through exact-SHA review | `.agents/workflows/codex-collaboration-core.md` |
| `multi-cc` | Plan, execute, merge, and close one roadmap-linked mission composed of sequential Compact Codex Collaboration PRs | `.agents/workflows/multi-cc.md` |
| `codex-relay-core` | Execute confirmed relay tasks sequentially, checkpoint them, update roadmap state, and finish through exact-SHA review | `.agents/workflows/codex-relay-core.md` |
| `add-card` | Deduplicate in Staging, create and validate canonical card JSON, ship it through the script-only uploader, then reuse the same verified artifact for authorized Production promotion | `.agents/workflows/add-card.md` |
| `add-membership` | Create a new membership product JSON using the shared card-product catalog pipeline, register it, and upload it through the canonical script | `.agents/workflows/add-membership.md` |
| `ship` | Resumable staging-first patch ship with immutable validation, `main` promotion, Latest publication, and support-only reconciliation to `dev` | `.agents/workflows/ship.md` |
| `shipc` | Full fixed `release-branch` patch ship matching `ship`, with automated test suites explicitly skipped | `.agents/workflows/shipc.md` |
| `i18n-staging-sync` | Fix i18n catalog and review-ledger blockers before staging deploy without broad translation churn | `.agents/workflows/i18n-staging-sync.md` |
| `deploy` | Deploy public hosting, admin hosting, functions, rules, storage, and dedicated card assets to Firebase staging or production | `.agents/workflows/deploy.md` |
| `prod-deploy` | Prepare a production deploy verification report from the current live production version to a target ref | `.agents/workflows/prod-deploy.md` |
| `release` | Run the direct main-first release flow or canonical ship's split staging-first candidate/promotion flow | `.agents/workflows/release.md` |
| `hotfix` | Prepare a short-lived production hotfix from a released tag, optionally cherry-pick reviewed commits, verify, feed the fix through main, and clean up | `.agents/workflows/hotfix.md` |
| `feature` | Manage the full feature lifecycle in a dedicated worktree with plan, design, and finish gates, PR squash merge to main, and post-merge cleanup | `.agents/workflows/feature.md` |
| `chrome-extension-release` | Prepare and publish the Chrome extension through Chrome Web Store, including the manifest sensitive-change hard stop, prod env/auth validation, status, version bump, dry-run, provider replay before upload, zip verification, listing assets, and publish submission | `.agents/workflows/chrome-extension-release.md` |
| `run-firestore-script` | Run one-off read-only, dry-run, or fix-mode Firestore admin scripts safely | `.agents/workflows/run-firestore-script.md` |
| `suggestion-approval-ops` | Generate or freeze suggestions, approve and audit Staging, preflight Production, then promote, approve, audit, resume, and summarize | `.agents/workflows/suggestion-approval-ops.md` |
| `publish-ask-ai-product-knowledge` | Publish the Ask AI product-knowledge corpus to Firestore (`config/askAiProductKnowledge`) so functions pick it up within ~60 min without a deploy | `.agents/workflows/publish-ask-ai-product-knowledge.md` |
| `grant-welcome-card-slots` | Grant a reviewed user permanent welcome card slots, prepare the matching welcome email, and verify the result | `.agents/workflows/grant-welcome-card-slots.md` |
| `perkperks-ingestion` | Compare PerkPerks against Firestore, verify diffs, build missing cards, source card art, and promote through staging | `.agents/workflows/perkperks-ingestion.md` |
| `card-product-staging-rollout` | Automatically deploy, upload, and verify card product JSON, Firestore data, `/cards/add`, and card assets on Staging before production | `.agents/workflows/card-product-staging-rollout.md` |
| `staging-qa` | Run the fast post-deploy staging QA gate, with health-only default build checks and optional strict expected-build verification | `.agents/workflows/staging-qa.md` |
| `staging-tracker-verification` | Run the standard production-derived tracker verifier with trigger-owned cleanup and exact card/tracking/profile restoration | `.agents/workflows/staging-tracker-verification.md` |
| `staging-user-journey-verification` | Verify core hosted-staging user journeys with read-only smoke, staging-safe writes, direct Firestore inspection, and cleanup | `.agents/workflows/staging-user-journey-verification.md` |
| `staging-diff-verification` | Verify deploy-relevant diffs on hosted staging by reusing deploy QA, doing targeted browser or Firestore checks, and exercising staging-safe user writes with readback and cleanup | `.agents/workflows/staging-diff-verification.md` |
| `native-staging-verification` | Verify staging native shells on local iOS and Android simulators with safe credential handling and evidence-based failure classification | `.agents/workflows/native-staging-verification.md` |
| `marketing-recordings` | Record, verify, and promote Perkmon marketing screenshots and journey videos from staging or approved synthetic demo scenes | `.agents/workflows/marketing-recordings.md` |
| `seo-geo-audit` | Audit website SEO and GEO readiness across public surfaces, metadata, crawlability, structured data, rendering strategy, and AI citation readiness | `.agents/workflows/seo-geo-audit.md` |
| `pr-agent-loop` | Shared PR comment protocol for coding and review agents working across independent worktrees and agent runtimes | `.agents/workflows/pr-agent-loop.md` |
| `pr-adversarial-loop` | Coordinate PCL, PRL, fresh adversarial review, full verification, SHA-bound approval, and merge | `.agents/workflows/pr-adversarial-loop.md` |
