---
name: test-coverage-report
description: Report the current test surface and testing gaps across unit, contract, integration, and end-to-end layers for this repository. Use when the user asks what is covered today, where gaps remain, which user journeys are weakly protected, what tests exist for a feature, or what the next highest-value tests should be.
---

# Test Coverage Report

Produce a current-state test inventory and gap analysis for this repo.

Treat "coverage" as two separate concepts:

- **Line coverage**: instrumented percentages from the Vitest frontend suite
- **Behavioral coverage**: which product areas, boundaries, and user journeys are actually asserted by tests

Unless the user explicitly asks for percentages, prioritize behavioral coverage.
Default to a scorecard-style report that is easy to scan in Markdown.

## Workflow

1. Inventory the suite.
   - Run:
     ```bash
     node .agents/skills/test-coverage-report/scripts/test_inventory.mjs
     ```
   - Prefer the table view for user-facing reports:
     ```bash
     node .agents/skills/test-coverage-report/scripts/test_inventory.mjs --markdown
     ```
   - For a narrow feature, filter the inventory:
     ```bash
     node .agents/skills/test-coverage-report/scripts/test_inventory.mjs --match perks --markdown
     ```
   - Read `references/current-test-surface.md` before summarizing results.

2. Confirm the relevant commands.
   - Use `package.json`, `vitest.config.ts`, `vitest.rules.config.ts`, and `e2e/README.md` as source of truth.
   - If the user wants executable validation, mention the smallest relevant command:
     - `npm run test:journeys:local` for the main user loop
     - `npm run test:e2e:pr` for emulator-safe Playwright coverage
     - `npm run test:coverage` for frontend line coverage only
     - `npm run test:rules` for Firestore rules coverage

3. Classify before judging.
   - `unit`: isolated logic and helpers
   - `contract`: schemas, rules, API boundaries, callables, triggers, payload shapes
   - `integration`: rendered components, pages, providers, contexts, and multi-module Vitest flows
   - `e2e`: browser or device flows
   - The inventory script is heuristic. Correct obvious misclassifications instead of repeating them blindly.

4. Map tests to product surfaces.
   - Group by feature or journey, not just by file count.
   - Separate strong outcome-based tests from smoke tests that only prove a page renders.
   - For user-facing reporting, use the current core loop unless the user asks otherwise:
     1. access/auth
     2. dashboard
     3. wallet/cards
     4. perks
     5. tracker

5. Report gaps in priority order.
   - Missing core user-journey outcomes
   - Missing boundary or contract assertions
   - Smoke-only coverage that should become behavioral coverage
   - Areas with no local regression path
   - Secondary surfaces that are intentionally de-prioritized

6. Score each section.
   - Use the scoring rubric from `references/current-test-surface.md`.
   - Score both layer-level confidence and major product surfaces when it helps the user.
   - Keep the score honest. A large number of smoke tests should not score highly.

## Output Format

Use this structure unless the user asks for something else:

```md
## Coverage Snapshot

| Layer | Score | Evidence | Notes |
|---|---:|---|---|
| Unit | 0-5 | ... | ... |
| Contract | 0-5 | ... | ... |
| Integration | 0-5 | ... | ... |
| E2E | 0-5 | ... | ... |

## Journey Scorecard

| Area | Score | Layer Support | Status |
|---|---:|---|---|
| Access/Auth | 0-5 | ... | ... |
| Dashboard | 0-5 | ... | ... |
| Wallet/Cards | 0-5 | ... | ... |
| Perks | 0-5 | ... | ... |
| Tracker | 0-5 | ... | ... |

## Strong Coverage
- ...

## Gaps
- ...

## Next Best Tests
1. ...
2. ...
3. ...

## Commands
- ...
```

Prefer short tables over long bullets when summarizing inventory. Use bullets for interpretation, risks, and next actions.

## Rules

- Do not claim a full-repo percentage from `npm run test:coverage`; it only measures frontend `src/` files.
- Do not equate test-file count with confidence. Prefer outcome coverage over raw volume.
- Call out uncertainty when a classification is heuristic or a test only partially covers a surface.
- If the user asks about a changed area, inspect the relevant files and tests directly instead of relying only on the inventory script.
- Use score meanings consistently:
  - `0`: effectively uncovered
  - `1`: smoke or fragmentary coverage only
  - `2`: some targeted tests, but major gaps remain
  - `3`: credible baseline coverage
  - `4`: strong and multi-layered coverage
  - `5`: deep, redundant, high-confidence coverage
