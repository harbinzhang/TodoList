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
| `ship` | Optionally sync a named remote branch, then sync remote main, commit intended changes, run a patch release, deploy the released build to Firebase staging, and run staging validation | `.agents/skills/ship/SKILL.md` |
| `deploy` | Deploy the application to Firebase using the shared staging/prod deploy workflow, including dedicated card-asset hosting | `.agents/skills/deploy/SKILL.md` |
| `release` | Prepare a branch-based release from the currently checked out branch tip by merging it into main, applying version bump, creating the matching semver tag, and ending with a clean worktree | `.agents/skills/release/SKILL.md` |
| `hotfix` | Prepare a short-lived production hotfix from a released tag, optionally cherry-pick reviewed commits, run patch release verification, feed the fix through main, and clean up the hotfix branch/worktree | `.agents/skills/hotfix/SKILL.md` |
| `feature` | Manage the full feature lifecycle in a dedicated git worktree and branch created from the current branch tip, with plan, design, and finish gates, PR squash merge to main, and post-merge branch/worktree cleanup | `.agents/skills/feature/SKILL.md` |
| `rebase` | Create a fresh branch in the current worktree, then hard-reset it to its upstream remote ref or a named remote branch such as `dev6`, discarding all uncommitted local tracked changes without a second confirmation prompt | `.agents/skills/rebase/SKILL.md` |
| `ios-release` | Build and upload iOS app to App Store Connect / TestFlight with correct cross-platform version syncing | `.agents/skills/ios-release/SKILL.md` |
| `firestore` | Inspect or modify Firestore data using the shared Firestore workflow and project conventions | `.agents/skills/firestore/SKILL.md` |
| `monitor` | Run read-only production health monitoring scripts and analyze unexpected Firestore signals | `.agents/skills/monitor/SKILL.md` |
| `benefit-drift-audit` | Run the read-only benefit-tracking drift audit, or use the aggregate user-level tracking wrapper for one-user investigations | `.agents/skills/benefit-drift-audit/SKILL.md` |
| `sync-core-branches` | Execute a two-stage branch sync (current→main, main→configured release/core branches) with optional auto conflict resolution | `.agents/skills/sync-core-branches/SKILL.md` |
| `local-emulator-admin-setup` | Set up local Firebase emulators with a seeded admin test account and real card products for local testing | `.agents/skills/local-emulator-admin-setup/SKILL.md` |
| `re` | Review current-branch git changes in the active worktree for bugs, conventions compliance, code quality, and Cloud Functions entrypoint test parity (matrix sync + high-risk helper coverage) | `.agents/skills/re/SKILL.md` |
| `pr-coding-loop` | Create and maintain implementation PRs from coding-agent worktrees using upstream-derived PR bases and the shared PR agent comment protocol | `.agents/skills/pr-coding-loop/SKILL.md` |
| `pr-review-loop` | Review PRs from a primary review worktree using a bounded interval-based PR agent comment loop, Chinese human summaries, and SHA-bound GOOD_TO_GO signals | `.agents/skills/pr-review-loop/SKILL.md` |
| `gha-monitor` | Check recent GitHub Actions workflow runs and surface failures or anomalies | `.agents/skills/gha-monitor/SKILL.md` |
| `android-release` | Prepare and ship an Android release to Google Play via CI or local build | `.agents/skills/android-release/SKILL.md` |
| `android-screenshots` | Capture and upload Play Store screenshots for phone, 7-inch, and 10-inch tablets | `.agents/skills/android-screenshots/SKILL.md` |
| `seo-geo-audit` | Audit website SEO and GEO readiness across public surfaces, metadata, crawlability, structured data, rendering strategy, and AI citation readiness | `.agents/skills/seo-geo-audit/SKILL.md` |
| `test-coverage-report` | Report current unit, contract, integration, and e2e test coverage surfaces and the highest-value gaps | `.agents/skills/test-coverage-report/SKILL.md` |
| `test-quality-audit` | Assess whether tests provide behavioral confidence across trigger, boundary, side effect, reader, and edge-case coverage | `.agents/skills/test-quality-audit/SKILL.md` |
| `tdd` | Drive feature work or bug fixes using a Red-Green-Refactor test-driven development cycle | `.agents/skills/tdd/SKILL.md` |
| `test-gen` | Generate unit, integration, or E2E tests for uncovered code by analyzing source and matching existing patterns | `.agents/skills/test-gen/SKILL.md` |
| `verify` | Run all test suites (unit, TypeScript, build, E2E, Firestore rules) and report a pass/fail summary | `.agents/skills/verify/SKILL.md` |
| `staging-tracker-verification` | Verify the staging tracker flow with remote staging E2E, direct Firestore inspection, temporary staging userCard creation, and cleanup | `.agents/skills/staging-tracker-verification/SKILL.md` |
| `staging-qa` | Run the fast post-deploy staging QA gate across remote E2E, Firebase Auth/Firestore health, Hosting build metadata, and stale test-data cleanup, with health-only default build checks and optional strict expected-build verification | `.agents/skills/staging-qa/SKILL.md` |
| `staging-user-journey-verification` | Verify core hosted-staging user journeys with read-only smoke, staging-safe writes, direct Firestore inspection, and cleanup | `.agents/skills/staging-user-journey-verification/SKILL.md` |

Agent-specific command wrappers should stay thin and point back to these canonical skill docs instead of duplicating them.

## Available Workflows

| Workflow | Purpose | Entry Point |
|---|---|---|
| `add-card` | Create a new card product JSON, add card art, register it in the catalog, and upload it through the admin path | `.agents/workflows/add-card.md` |
| `deploy` | Deploy hosting, functions, rules, storage, and dedicated card assets to Firebase staging or production | `.agents/workflows/deploy.md` |
| `run-firestore-script` | Run one-off read-only, dry-run, or fix-mode Firestore admin scripts safely | `.agents/workflows/run-firestore-script.md` |
| `perkperks-ingestion` | Compare PerkPerks against Firestore, verify diffs, build missing cards, source card art, and promote through staging | `.agents/workflows/perkperks-ingestion.md` |
| `card-product-staging-rollout` | Upload card product JSON through staging admin, verify Firestore, `/cards/add`, and hosted card assets before production | `.agents/workflows/card-product-staging-rollout.md` |
| `staging-qa` | Run the fast post-deploy staging QA gate, with health-only default build checks and optional strict expected-build verification | `.agents/workflows/staging-qa.md` |
| `pr-agent-loop` | Shared PR comment protocol for coding and review agents working across independent worktrees and agent runtimes | `.agents/workflows/pr-agent-loop.md` |
