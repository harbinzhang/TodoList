---
name: test-quality-audit
description: Use when judging whether existing tests provide real behavioral confidence, especially when tests rely heavily on mocks, companion tests may only cover validation, or a feature has a suspicious green suite but broken production behavior.
---

# Test Quality Audit

Audit test quality as behavioral confidence, not file count or line coverage.

## Core Standard

A high-quality test suite protects the full risk chain:

1. **Trigger**: user action, hook call, scheduled job, callable, or script entrypoint starts the behavior.
2. **Boundary**: external input/output is parsed and the real transport/write payload is asserted.
3. **Persistence / side effect**: Firestore, Functions, local storage, analytics, email, push, or worker state changes have the expected shape.
4. **Read / consumption**: downstream readers, aggregators, UI rows, monitors, or reports can consume that shape.
5. **Important edge**: one realistic failure or boundary case is covered, not just the happy path.

Mocks are acceptable at one layer only when the mocked layer has its own direct coverage.

## Workflow

1. Run the broad inventory only for orientation:
   ```bash
   node .agents/skills/test-coverage-report/scripts/test_inventory.mjs --markdown
   ```

2. Run the quality-risk scanner:
   ```bash
   node .agents/skills/test-quality-audit/scripts/test_quality_audit.mjs --markdown
   ```
   For a narrow area:
   ```bash
   node .agents/skills/test-quality-audit/scripts/test_quality_audit.mjs --match dashboard --markdown
   ```

3. Inspect each high-risk candidate manually. Do not report scanner output as fact without reading the source and relevant tests.

4. Score the feature or changed area:

| Score | Meaning | Signals |
|---:|---|---|
| 0 | Uncovered | No relevant tests |
| 1 | Smoke only | Renders or calls a mock, but no real boundary coverage |
| 2 | Partial | Some behavior covered, but a mocked boundary or downstream reader is untested |
| 3 | Baseline | Main path plus one boundary or edge case covered |
| 4 | Strong | Multi-layer coverage across trigger, boundary, side effect, and reader |
| 5 | Excellent | Strong coverage plus realistic failure modes and regression-specific assertions |

## Red Flags

- Test asserts `mockFn` was called, but the mocked module has no companion API/contract test.
- Callable test only covers `validatePayload` / schema parsing, while runtime writes or return shape are untested.
- UI table/panel test renders supplied rows, but the aggregation/query function that produces those rows is untested.
- E2E proves a seeded happy path but not the distinct reported path, such as guest vs signed-in or staging vs local.
- Test fixture defaults make the changed path pass without exercising the actual changed branch.
- A matrix says “covered” solely because a companion test file exists.

## Output Format

```md
## Test Quality Audit: <scope>

| Area | Score | Risk | Evidence | Improvement |
|---|---:|---|---|---|
| ... | ... | red/yellow/green | file refs | next best test |

## Highest-Value Fixes
1. Add/extend a boundary test for ...
2. Add a write-shape or aggregation test for ...
3. Add one failure/boundary scenario for ...

## Commands
- ...
```

## Improvement Rules

- Prefer one small boundary test over a broad snapshot.
- Pair every high-risk mocked API with a direct API/contract test.
- For write paths, assert exact collection/doc id, merge options, timestamp/increment sentinels, and no `undefined`.
- For read paths, assert query bounds, grouping keys, sorting, and zero/empty behavior.
- For production incidents, add a regression that reproduces the exact failing data shape or route, not a nearby happy case.
- If live state or deployment may be the cause, keep that separate from local test confidence and require read-only verification before drawing production conclusions.
