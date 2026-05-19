# Current Test Surface

Use this file for repo-specific context when reporting current test coverage and gaps.

## Commands

- `npm test`: run the default Vitest suite for `src/`
- `npm run test:coverage`: produce frontend line coverage for `src/**/*.{ts,tsx}` only
- `npm run test:rules`: run Firestore rules tests from `tests/`
- `npm run test:e2e:pr`: run Playwright emulator-safe `@pr` coverage
- `npm run test:journeys:local`: run the curated core user-journey regression (`Vitest` + `@journey-core` Playwright)
- `npm run test:e2e:release`: run broader remote write regression

## Important Caveats

- `npm run test:coverage` is not full-system coverage. [vitest.config.ts](/Users/haibinzhang/mine/react/perks-react/vitest.config.ts) excludes `functions`, `tests`, and `e2e`, so its percentage only reflects frontend `src/` files.
- Contract and integration are logical categories in this repo, not separate runners. Report them as a test inventory and boundary map, not as a single authoritative percentage unless the user explicitly asks for instrumentation.
- The Playwright suite mixes strong journey assertions with smoke tests. Distinguish “page loads” coverage from outcome-based coverage.

## Layer Heuristics

- `unit`: pure helpers, constants, reducers, serializers, and isolated hook logic
- `contract`: API clients, Firestore rules, schemas, callable payloads, trigger behavior, and backend boundary logic
- `integration`: rendered components, pages, providers, contexts, and multi-module hook flows inside Vitest
- `e2e`: Playwright or Maestro browser/device flows under `e2e/`

## Current Strengths

- Shared frontend logic has broad unit coverage across `src/shared/*`, benefit cadence/category utilities, deadline logic, toast/theme/update hooks, and error scrubbing.
- Benefits tracker has meaningful behavioral coverage in both Vitest and Playwright, including used/unused transitions, combine behavior, and reminder parsing.
- Wallet flows have decent coverage: add card, card detail, card removal, dashboard stats hook, and the local `@journey-core` lane.
- Backend contract-like coverage exists in `functions/src/` for callables, email rendering, referral trigger behavior, and card suggestion payload parsing.
- Settings and feedback have emulator-backed Playwright assertions that verify persistence, not just rendering.

## Current Weak Spots

- Router-level access control coverage is still thinner than the rest of the core loop. `AuthProvider` is covered, but `AppRouter` and `AuthGuard` behavior is not deeply exercised in Vitest.
- Chat coverage is still light on deterministic send/history/retry behavior. The browser tests mainly cover welcome state and input affordances.
- Travel and some secondary pages are mostly smoke-tested or untested at the behavior level.
- Contract coverage for some frontend-to-backend surfaces is uneven. `travelApi`, `aiApi`, and some newer user/referral interactions do not have the same depth as cards/tracker/auth.
- Admin coverage exists, but it should usually be separated from main-product journey reporting.

## Core Journey Baseline

The current repo treats these as the main PR-critical product loop:

1. Access the app
2. Understand value on dashboard
3. Build and maintain a wallet
4. Browse perks
5. Act on a benefit in the tracker

Use `@journey-core` Playwright tests and `npm run test:journeys:local` as the fastest current regression indicator for those flows.

## Reporting Guidance

When asked for a coverage report:

1. Start with the inventory script output.
2. Convert file counts into product-surface coverage, not just file counts.
3. Separate line coverage from behavioral coverage.
4. Call out meaningful gaps in this order:
   - missing core user journeys
   - weak boundary contracts
   - smoke-only flows that should assert outcomes
   - low-confidence or flaky surfaces
5. End with the next 3-5 highest-value tests to add.

## Scoring Rubric

Use a simple `0-5` confidence score for each layer or product surface.

| Score | Meaning | Typical Signals |
|---|---|---|
| 0 | Uncovered | No relevant tests found |
| 1 | Minimal | Smoke tests only, or a single narrow assertion |
| 2 | Partial | Some targeted tests exist, but major behavior or boundary gaps remain |
| 3 | Baseline | Credible protection for normal paths, but weak on edge cases or cross-layer confidence |
| 4 | Strong | Multi-layer coverage with meaningful outcome assertions |
| 5 | Excellent | Deep, redundant, high-confidence coverage across logic, boundaries, and journeys |

### Score Conservatively

- Favor the lower score when the evidence is mixed.
- Do not award `4` or `5` to areas dominated by render-smoke tests.
- A feature with only unit tests and no behavioral checks usually caps at `2`.
- A feature with only e2e smoke and no unit or contract support usually caps at `2`.
- Core journeys with local runnable regression paths deserve higher scores than equally-tested secondary surfaces.
