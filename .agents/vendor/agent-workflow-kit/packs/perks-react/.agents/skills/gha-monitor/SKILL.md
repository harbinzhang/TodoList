---
name: gha-monitor
description: Check recent GitHub Actions workflow runs and surface failures or anomalies.
---

# GitHub Actions Monitor

Use this skill when the user asks to check CI status, review recent GitHub Actions runs, or investigate workflow failures.

## Execution

1. Fetch recent workflow runs:
   ```bash
   gh run list --limit 20
   ```
2. For failed runs, fetch details:
   ```bash
   gh run view <run-id>
   gh run view <run-id> --log-failed
   ```
3. Classify each relevant run:
   - Passing: latest relevant checks are green.
   - Flaky: failed but a later run of the same workflow/branch passed.
   - Broken: latest run for a branch still fails.
   - Stale: scheduled workflow has not run when expected.
4. For broken runs, identify the failed step and whether the cause looks like a test failure, build error, deployment problem, timeout, or external infrastructure issue.

## Output

```md
## GitHub Actions Status

### Failed Runs
- [workflow] branch - run #ID - failed step: X - cause: Y

### Flaky Runs
- [workflow] branch - run #ID - intermittent failure in: X

### Passing
- N workflow runs passing across M branches

### Summary
X total runs checked, Y failure(s), Z flaky.
```

If all relevant runs are passing, report a clean status. Do not rerun or cancel workflows unless the user explicitly asks. Redact secrets from logs.
