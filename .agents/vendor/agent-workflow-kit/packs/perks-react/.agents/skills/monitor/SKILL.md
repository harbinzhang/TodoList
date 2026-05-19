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

2. For a broader production health sweep, run:
   ```bash
   npm run monitor:prod:health
   ```

3. If you only need recent raw client errors, query recent client errors from Firestore:
   ```bash
   npx firebase-tools firestore:query clientErrors --order-by="timestamp=desc" --limit=50 --project=perks-react
   ```

4. If the CLI query is not available or returns errors, use the Node.js Admin SDK approach:
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

5. Classify each error:
   - **Known / Expected**: Errors that match known patterns (network timeouts, auth token expiry, etc.) — note but do not flag
   - **Unexpected**: Errors that do not match known patterns — flag for investigation
   - **Recurring**: Same error appearing multiple times — note frequency and first/last occurrence

6. Report findings:

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
