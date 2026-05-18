---
name: tdd
description: "Drive feature work or bug fixes through a red-green-refactor cycle using the consumer repo's test commands and conventions. Use when implementing behavior with tests first or when a bug needs a proves-it regression test."
---

# Test-Driven Development

Read `.agents/repo-profile.yaml` before choosing commands.

Defaults:
- `commands.test`: `npm run test`
- `commands.verify`: `npm run verify`

## Workflow

1. Clarify expected behavior and choose the smallest useful test layer:
   - Unit: isolated logic, utilities, hooks, and pure functions.
   - Integration: components or modules with realistic providers and boundaries.
   - E2E: full user or system journeys when unit/integration tests cannot prove the behavior.
2. RED: write the smallest failing test that captures the behavior or bug. Do not write production code first.
3. Run the narrow test and confirm it fails for the expected reason.
4. GREEN: implement the minimum production change needed to pass.
5. Re-run the narrow test and confirm it passes.
6. REFACTOR while keeping tests green. Remove duplication and simplify only without changing behavior.
7. Repeat the red-green-refactor cycle until the behavior is complete.
8. Run the relevant broader command from `commands.test` or `commands.verify`.

## Bug Fix Pattern

For bug fixes, start with a proves-it regression test:

1. Write a test that fails because of the reported bug.
2. Fix the bug with the smallest production change.
3. Keep the regression test as the guard for that exact failure mode.

## Rules

- Test behavior and outcomes, not implementation details.
- For bug fixes, the first test must reproduce the bug.
- Mock external boundaries only when the mocked layer has direct coverage elsewhere.
- Prefer clear, descriptive tests over deduplicated tests that hide the scenario.
- One logical assertion per test is ideal. Multiple `expect` calls are acceptable when they assert one coherent outcome.
- Do not mock what the repo owns unless that boundary has direct companion coverage elsewhere.
- Remove debug logging before finishing.
- Report commands run and whether each passed or failed.
