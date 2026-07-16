---
name: add-high-quality-tests
description: "Use when adding or strengthening TypeScript, React, Firebase, Vitest, or Playwright tests for existing behavior, especially during coverage backfills, mock-heavy suites, flaky async flows, or suspicious green tests."
---

# Add High-Quality Tests

A test earns its place only when it catches a named regression and fails for the expected reason. Treat coverage as a confirmation signal after behavioral value, never as the target.

**REQUIRED SUB-SKILL:** Use `test-quality-audit` to choose and score testing gaps.

**REQUIRED SUB-SKILL:** Use `tdd` for new behavior and bug fixes.

## Workflow

1. Read the production path, existing tests, and any owned boundary that the test will mock. Run the narrow quality scanner before using coverage to rank work:

   ```bash
   node .agents/vendor/agent-workflow-kit/skills/test-quality-audit/scripts/test_quality_audit.mjs --match <area> --markdown
   ```

2. Write this contract for every candidate before implementing it:

   - **Regression killed:** one concrete wrong value, wrong branch, dropped side effect, stale result, or unauthorized transition.
   - **Observable proof:** the user-visible result or exact boundary/reader state that exposes the regression and remains valid after a refactor.
   - **Failure controls:** controlled time, randomness, request order, and shared state; state why the test should fail.
   - **Layer and companion:** the smallest layer that proves the behavior. A mocked owned boundary requires a direct companion test at that boundary.

   Do not implement a candidate with a missing field.

3. Choose the strongest applicable technique:

   | Risk | Technique |
   | --- | --- |
   | Nondeterminism | Fix the clock and IDs; use controlled promises. Never depend on sleeps or a live network. |
   | Broad input space | Assert an invariant such as “always” or “never.” Use `fast-check` only when it is already a direct, configured dependency; otherwise use focused table cases. Never auto-install it. |
   | Async race | Hold requests with deferred promises, resolve them in an explicit order, and assert the final observable state. Repeated reruns are not proof. |
   | UI behavior | Prefer role, accessible name, label, and user-visible text with real user events. Use a test ID only when no semantic selector exists or it is an established E2E contract. Do not prove behavior with CSS classes or mock existence alone. |
   | Persistence/API boundary | Assert the exact destination, payload, options, sentinels, and absence of `undefined`; test the reader too when round-trip meaning matters. |

4. Prove the test can detect wrong behavior:

   - For new behavior or a bug fix, observe the new test fail first for the expected reason, then make it pass.
   - For an existing-behavior backfill, use **mutation-lite**: introduce one temporary semantic fault such as dropping a field, choosing the wrong branch, reversing a sort, or suppressing a side effect. Run only the new test and confirm the expected failure. Restore the fault exactly, then rerun green.

   Before mutation-lite, capture the target file's diff. Never mutate a file containing unrelated user changes. Use a disposable worktree when needed; never use `git checkout`, `git reset`, or overwrites to restore work. After restoration, verify the diff exactly matches the baseline. If this cannot be done safely, report `mutation proof unavailable` and the reason—do not claim proof.

5. Validate in widening circles: the targeted test, the quality scanner with `--match`, the related suite, then the repository's broader test command in proportion to risk. Check coverage only after these gates pass.

## Candidate Example

| Field | Example |
| --- | --- |
| Regression killed | Saving a benefit drops `enrollmentRequired: false` because falsey values are filtered. |
| Observable proof | The persistence boundary receives the exact field and the reader returns `false`. |
| Failure controls | Fixed timestamp and deterministic document ID; failure must identify the missing field. |
| Layer and companion | UI/service test plus a direct persistence-adapter round-trip test. |

## Reject These Rationalizations

| Rationalization | Response |
| --- | --- |
| “A fast, mock-only plan is enough.” | A mock-only test needs an observable outcome and direct companion coverage for any owned boundary. |
| “Add it if branch coverage is still short.” | An uncovered branch is not a regression contract. Name the bug first. |
| “This cheaply exercises several branches.” | Cheap execution counts only after the test proves one meaningful behavior. |
| “The mock was called, the CSS class exists, or the component rendered.” | Those assertions alone do not establish the intended user or system outcome. |

## Report

For each added test, report: the regression killed, the observable assertion, RED or mutation-lite evidence, commands run, and any residual gap or unavailable proof.
