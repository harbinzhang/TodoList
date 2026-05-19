---
name: gha-monitor
description: Check recent GitHub Actions workflow runs and surface failures or anomalies
---

# GitHub Actions Monitor Skill

Use this skill when the user asks to check CI status, review recent GitHub Actions runs, or investigate workflow failures.

## Execution

1. Fetch recent workflow runs:
   ```bash
   gh run list --limit 20
   ```

2. If there are any failed runs, fetch details for each failure:
   ```bash
   gh run view <run-id>
   gh run view <run-id> --log-failed
   ```

3. Analyze results and classify each run:
   - **Passing**: All checks green — no action needed
   - **Flaky**: Failed but the same workflow passed on a subsequent run of the same branch — note as flaky
   - **Broken**: Failed on the latest run for a branch — needs attention
   - **Stale**: Scheduled workflow that hasn't run recently — note as potentially misconfigured

4. For broken runs, look at the failed logs to identify:
   - Which step failed
   - Whether the failure is a test failure, build error, deployment issue, or infra/timeout
   - Whether the failure is likely related to the code change or is an environment issue

5. Report findings in this format:

   ```
   ## GitHub Actions Status

   ### Failed Runs (need attention)
   - [workflow] branch — run #ID — failed step: X — cause: Y

   ### Flaky Runs (investigate if recurring)
   - [workflow] branch — run #ID — intermittent failure in: X

   ### Passing
   - N workflow runs passing across M branches

   ### Summary
   X total runs checked, Y failure(s), Z flaky.
   Last successful run on main: <timestamp>
   ```

   If all runs are passing, report a clean status.

## Notes

- Always check `main` branch health first — it is the most critical.
- For scheduled workflows (e.g., Daily E2E Smoke), note if they are running on schedule.
- Do not re-run or cancel workflows unless the user explicitly asks.
- Redact any secrets or tokens that may appear in logs.
