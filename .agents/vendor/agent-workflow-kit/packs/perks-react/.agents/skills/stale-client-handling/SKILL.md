---
name: stale-client-handling
description: Detect, classify, record, and mitigate suspected stale-client writes to Perks React tracking data. Use when monitoring reports mention stale client, stale_client_suspected_unexpired_write, tracking bad writes, welcome bonus reward_like writes, missing client version/writeAuditSignals, repeated userCardBenefitsTracking drift for a user, or when deciding whether to send a browser refresh email or run a tracking repair script.
---

# Stale Client Handling

Use this skill for suspected stale browser/client writes to `userCardBenefitsTracking`. Keep production work read-only until the user explicitly approves an email send or Firestore fix.

## Safety

- Treat production as read-only by default.
- Do not run `--fix`, `--send`, `--allow-production`, or `--allow-production-fix` unless the user explicitly approves that action in the current turn.
- Do not commit changes to `monitoring/daily/tracking-bad-write-known-users.json` unless the user asks for a commit. Local edits are allowed when recording stale-client history.
- Store durable repo history as `uidHash`, not raw uid. Raw uid may appear in `/tmp` investigation reports or command output when needed, but avoid adding raw uid to tracked repo files.

## Detect

Start from the most specific existing report or script:

```bash
npm run monitor:tracking-new:prod -- --warn-only
npm run monitor:tracking-bad-writes:prod -- --warn-only
npm run monitor:welcome-bonus-tracking:prod -- --warn-only
npm run monitor:user-tracking:prod -- --warn-only --user-id <uid> --days 7
```

Classify as likely stale client when one or more of these hold:

- `tracking-new` reports `stale_client_suspected_unexpired_write`.
- A tracking write has malformed or legacy shape and there is no matching `writeAuditSignals` row with `appVersion` / client version for that document.
- The write or sampled tracking row carries no client version/source fields even though current clients are expected to report versioned write audit signals.
- The uidHash is already present in `monitoring/daily/tracking-bad-write-known-users.json` and the new symptom matches the prior pattern.
- Welcome bonus rows record reward units in `usedAmount` where spend/progress is expected, especially repeat rows for a known stale uidHash.

Classify as possible stale client when shape and timing match but the row lacks direct source fields. Classify as not supported when recent `tracking-new`, `tracking-bad-writes`, and user-level audit are clean for the uid and there is a better explanation such as planned backend migration or current server reconcile.

## Record

Use `monitoring/daily/tracking-bad-write-known-users.json` as the durable stale-client history file.

1. Hash raw uid before recording:

   ```bash
   node -e "const crypto=require('crypto'); console.log(crypto.createHash('sha256').update(process.argv[1]).digest('hex').slice(0,16))" '<uid>'
   ```

2. If the uidHash is new, append a user entry:

   ```json
   {
     "uidHash": "<16-char hash>",
     "firstSeenAt": "<ISO timestamp>",
     "reason": "<short stale-client evidence summary>",
     "status": "watch",
     "notes": []
   }
   ```

3. For every repeat or follow-up, append a note with:
   - `observedAt`
   - `source` such as `tracking-new-health`, `tracking-bad-write-health`, or `welcome-bonus-tracking-health`
   - `classification`: `likely_stale_client`, `possible_stale_client`, or `not_supported`
   - `summary`
   - `seenBefore`
   - `handled`: `refresh_email_sent`, `cleanup_observed`, `not_yet`, or `unknown`

Report local JSON edits as stale history updates needing human review.

## Check Seen-Before And Outreach

When uidHash already exists and the current signal is likely or possible stale client:

1. Say whether it was seen before.
2. Check the existing entry for `handled` / refresh-email notes.
3. If not handled, suggest sending a targeted refresh email. Do not send without explicit approval.
4. Use `docs/operations/maintenance-email-outreach.md` for the approved send flow and campaign `web-refresh-stale-client`.
5. After an approved send, append a note to the known-users JSON with `handled: "refresh_email_sent"` and the ledger path.

If the user only asks for analysis, stop at the recommendation.

## Mitigate Records

Choose an existing dry-run script based on the report shape. Run from `functions/` unless the script docs say otherwise.

- Duplicate/random-id tracking rows:

  ```bash
  npx ts-node --project tsconfig.json ../exp/functions-scripts/dedup-benefit-tracking.ts --project perks-react --user-id <uid>
  ```

- Once-benefit wrong-period or canonical drift:

  ```bash
  npx ts-node --project tsconfig.json ../exp/functions-scripts/repair-once-benefit-tracking-drift.ts --project perks-react --user-id <uid>
  ```

- Missing canonical used tracking row:

  ```bash
  npx ts-node --project tsconfig.json ../exp/functions-scripts/repair-missing-canonical-used-tracking.ts --project perks-react --user-id <uid>
  ```

- Stale once-benefit rows for a known benefit:

  ```bash
  npx ts-node --project tsconfig.json ../exp/functions-scripts/cleanup-stale-once-benefit-tracking.ts --project perks-react --benefit-id <benefitId>
  ```

Only after reviewing the dry-run report and receiving explicit approval, rerun with the script's write flags (`--fix`, and `--allow-production` or `--allow-production-fix` when required). After any fix, rerun the relevant monitor and record the result in the known-users JSON.

## Report

Use this concise shape:

```text
Stale client classification: likely | possible | not supported | evidence insufficient
seen before: yes/no (uidHash=...)
handled: refresh_email_sent | cleanup_observed | not_yet | unknown
newly recorded: yes/no
evidence:
- ...
recommended next step:
- ...
reports:
- ...
```
