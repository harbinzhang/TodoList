---
name: monitor
description: Pull recent production client errors from Firestore and analyze them for unexpected issues
---

# Production Health Monitor

Pull recent production health signals from Firestore and surface unexpected issues. Prefer the root-level read-only monitoring scripts so manual checks and agent checks use the same behavior.

## Execution

1. Run the production signal check:
   ```bash
   npm run monitor:contract-signals:prod
   ```

2. Run the raw client signal check for recent client errors and warnings:
   ```bash
   npm run monitor:client-signals:prod
   ```

   This already counts the browser-extension `partial_sync_failure` warnings toward the generic clientWarnings threshold.

3. Run the extension partial-sync-failure check for per-provider degradation:
   ```bash
   npm run monitor:partial-sync-failures:prod
   ```

   Reads `clientWarnings` filtered to `classification=partial_sync_failure` and alerts on: one provider exceeding the frequency threshold, and an abnormal `failedCards/attemptedCards` ratio (above a minimum sample). The signal is identity-free (counts and HTTP-status categories only — no uid, no stable user key), so aggregation is per-provider; the user already saw a green `done`, so a triggered alert means a real system-side degradation to investigate, not a user-facing error. Tune via `--max-per-provider`, `--max-failure-ratio`, `--min-ratio-sample`; non-zero exit (unless `--warn-only`) signals a breached threshold. Included in `monitor:prod:health` as an `observing` monitor (breaches are recorded in the ledger but do not fail the sweep). (Per-user "same user repeatedly failing" alerting is intentionally not implemented — the signal carries no stable user key.)

4. Run the extension performance check for slow content-script / message-handler / render hot paths:
   ```bash
   npm run monitor:extension-perf:prod
   ```

   Reads `clientWarnings` filtered to `classification=extension_perf` (type `extension_perf_slow`) and aggregates per `(script, handler)` — e.g. `provider-run-ui/render_overlay`, `background/fanout_prewarm_dispatch` — with a bucket histogram, severe (`gte_500ms`) share, and avg/max duration. Alerts on: a `(script,handler)` group exceeding the observed-frequency threshold, and an abnormally high severe share (above a minimum sample). The signal is identity-free (closed-vocabulary enums + a rounded duration only — no URL, DOM, merchant, card, or account), so aggregation is per-hot-path, not per-user. **Sampling:** only a 10% sample of `>250ms` events reaches telemetry (the full stream is console-only during live DevTools debugging), so observed counts are ~10% of real occurrences — a triggered alert means a genuinely slow extension path. Tune via `--max-per-group`, `--max-severe-share`, `--min-share-sample`; non-zero exit (unless `--warn-only`) signals a breached threshold. Included in `monitor:prod:health` as an `observing` monitor (breaches are recorded in the ledger but do not fail the sweep). For trend/history browsing, the same signals appear in the admin Client Signals view (`admin-perkmon`) filtered to `classification=extension_perf`.

5. For a cost-aware production health sweep, run:
   ```bash
   npm run monitor:prod:health
   ```

   This defaults to the light sweep (9 monitors, the `light` routine) so the once-daily
   full-collection scans `card-perks-count` and `firestore-duplicates` run in AM. The PM
   sweep is the `pm` routine — the shared time-window light monitors plus
   `reminder-delivery`, `push-delivery`, and `stale-client-rca` — and deliberately excludes
   the two full scans so they are not repeated:
   ```bash
   npm run monitor:prod:health:pm
   ```

   Use the deep sweep (17 monitors) only when you are explicitly investigating
   persisted-data drift or preparing a lower-frequency audit:
   ```bash
   npm run monitor:prod:health:deep
   ```

   All sweeps run through `monitoring/daily/run-monitor.mjs`, which executes each
   monitor's manifest `exec` command and appends one JSONL line per monitor per run
   to `monitoring/ledger/YYYY-MM.jsonl`. Each monitor declares a `lifecycle` in
   `monitor-manifest.json`: an `observing` monitor's breach (`warn`) is recorded but
   does not fail the sweep; an `enforcing` monitor's breach does fail it. A `critical`
   result (monitor could not read data) always fails the sweep regardless of lifecycle.
   Sweep failure now means an enforcing breach or a critical monitor — not any `warn`.

   Routine AM automation may also run the manifest-listed doc-delta contract
   conformance supplement:
   ```bash
   npm run monitor:contract-conformance:prod:delta
   ```

   This reads only recently changed documents and complements the
   `monitor:contract-signals:prod` runtime signal window. Full contract
   conformance stays in `monitor:prod:health:deep`.

   Before routine production automation runs, estimate the read budget from the
   manifest and include the generated report path in the final summary:
   ```bash
   npm run monitor:manifest:validate
   npm run monitor:cost:estimate -- --dry-run --automation-id daily-monitoring-am
   npm run monitor:cost:estimate -- --dry-run --automation-id daily-monitoring-pm
   ```

   After running a prod sweep, commit the `monitoring/ledger/` diff so the run is
   part of the graduation history other agents/humans rely on for `monitor:baseline`:
   ```bash
   git add monitoring/ledger/
   git commit -m "chore(monitoring): ledger YYYY-MM-DD <sweep>"
   ```

   Weekly, alongside the deep sweep: run `MONITORING_IT_DEEP=1 npm run test:monitors` to re-prove detector correctness end to end (fast set runs in the default `npm run test:monitors` any time).

6. If you only need recent raw client errors, query recent client errors from Firestore:
   ```bash
   npx firebase-tools firestore:query clientErrors --order-by="timestamp=desc" --limit=50 --project=perks-react
   ```

7. If the CLI query is not available or returns errors, use the Node.js Admin SDK approach:
   ```bash
   node -e "
   const admin = require('firebase-admin');
   admin.initializeApp();
   admin.firestore().collection('clientErrors')
     .orderBy('timestamp', 'desc')
     .limit(50)
     .get()
     .then(snap => snap.docs.forEach(d => console.log(JSON.stringify(d.data()))))
   "
   ```

8. Classify each error:
   - **Known / Expected**: Errors that match known patterns (network timeouts, auth token expiry, etc.) — note but do not flag
   - **Unexpected**: Errors that do not match known patterns — flag for investigation
   - **Recurring**: Same error appearing multiple times — note frequency and first/last occurrence

9. Report findings:

   ```
   ## Production Error Monitor

   ### Unexpected Errors (investigate)
   - [timestamp] error message — count: N — affected users: M

   ### Recurring Known Errors (monitor)
   - [timestamp] error message — count: N — pattern: known-reason

   ### Summary
   X total errors in last Y hours, Z unexpected.
   ```

   If no unexpected errors, report a clean status.

## Notes

- Do not modify or delete any error documents.
- Redact any PII (emails, user IDs) from the report.
- If access to Firestore fails, inform the user and suggest checking credentials/permissions.
