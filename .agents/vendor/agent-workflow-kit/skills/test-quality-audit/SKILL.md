---
name: test-quality-audit
description: "Assess whether tests provide real behavioral confidence, especially when tests rely on mocks, companion tests only cover validation, or a green suite does not cover the reported behavior."
---

# Test Quality Audit

Audit test quality as behavioral confidence, not file count or line coverage.

## Core Standard

A strong test protects the full risk chain:

1. Trigger: user action, job, callable, script, or hook starts behavior.
2. Boundary: external input/output or transport shape is asserted.
3. Side effect: persistence, network, filesystem, queue, worker, or UI state changes as expected.
4. Reader: downstream consumer can read the produced shape.
5. Edge: at least one realistic failure or boundary case is covered.

Mocks are acceptable only when the mocked layer has direct coverage elsewhere.

## Red Flags

- A test asserts a mock was called, but the mocked module has no companion API, contract, or boundary test.
- A companion test only covers validation/schema parsing while runtime writes, return shape, or side effects are untested.
- A UI test renders supplied rows, but the query, aggregation, or transform that produces those rows is untested.
- An E2E test proves a seeded happy path but not the distinct reported path.
- Fixture defaults make the changed path pass without exercising the actual changed branch.
- A coverage matrix says "covered" only because a companion test file exists.

## Workflow

Run heuristic scanners for orientation:

```bash
node .agents/vendor/agent-workflow-kit/skills/test-quality-audit/scripts/test_inventory.mjs --markdown
node .agents/vendor/agent-workflow-kit/skills/test-quality-audit/scripts/test_quality_audit.mjs --markdown
```

For a narrow area:

```bash
node .agents/vendor/agent-workflow-kit/skills/test-quality-audit/scripts/test_quality_audit.mjs --match <area> --markdown
```

Then manually inspect high-risk candidates. Do not report scanner output as fact without reading source and tests.

## Score

| Score | Meaning |
|---:|---|
| 0 | Uncovered |
| 1 | Smoke only |
| 2 | Partial |
| 3 | Baseline |
| 4 | Strong |
| 5 | Excellent |

## Output

```md
## Test Quality Audit: <scope>

| Area | Score | Risk | Evidence | Improvement |
|---|---:|---|---|---|
| ... | ... | red/yellow/green | file refs | next test |

## Highest-Value Fixes
1. ...

## Commands
- ...
```

## Improvement Rules

- Prefer one small boundary test over a broad snapshot.
- Pair every high-risk mocked API with a direct API or contract test.
- For write paths, assert exact destination, merge/update options, sentinel values, and absence of invalid values.
- For read paths, assert query bounds, grouping keys, sorting, and empty-state behavior.
- For production incidents, add a regression that reproduces the exact failing data shape or route, not a nearby happy case.
- If live state or deployment may be the cause, keep that separate from local test confidence and require read-only verification before drawing production conclusions.
