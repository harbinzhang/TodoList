---
name: monitor
description: Pull recent production client errors from Firestore and analyze them for unexpected issues
---

# Monitor Skill

Pull and analyze recent client errors from the `clientErrors` Firestore collection to identify unexpected production issues.

## Steps

1. Run the fetch script from the project root to pull recent errors:

// turbo
```bash
node .agents/skills/monitor/scripts/fetch-client-errors.cjs
```

The script resolves `firebase-admin` from `functions/node_modules` automatically. It outputs the last 30 client errors grouped by fingerprint.

Options: `--limit N` (default 30), `--days N` (default 7).

2. After receiving the output, **analyze the errors** by grouping them by fingerprint and type. For each error group, classify it as:

   - **Expected/benign**: Offline errors, network-request-failed — these are normal user conditions
   - **Actionable**: Unhandled rejections with vague messages, token expiry, IndexedDB failures — these may indicate code issues
   - **Critical**: Any new error types, server errors, or errors affecting core flows (login, task CRUD, project/label management)

3. Present the analysis as a summary table with:
   - Error type and message
   - Count / frequency
   - Pages affected
   - Classification (expected / actionable / critical)
   - Recommended action (if any)

## Known Expected Errors

These error patterns are normal and expected in production:

| Fingerprint | Type | Message | Why Expected |
|------------|------|---------|-------------|
| (tbd) | `firestore_read` | "Failed to get document because the client is offline" | Mobile users with flaky connections |
| (tbd) | `auth_error` | "auth/popup-closed-by-user" | User cancelled social login popup |
| (tbd) | `auth_error` | "auth/network-request-failed" | Device offline during auth |

## Actionable Error Patterns

Watch for these — they often indicate real issues:

| Pattern | What It Means | Suggested Fix |
|---------|---------------|--------------|
| `"Rejected"` with no message | Promise rejected with non-Error value | Wrap rejection handlers to capture actual value |
| `auth/user-token-expired` | User session expired without refresh | Check token refresh logic in AuthProvider |
| New fingerprints | Never-before-seen errors | Investigate immediately |
| Spikes in any error type | Possible deployment regression | Check recent deploys |
