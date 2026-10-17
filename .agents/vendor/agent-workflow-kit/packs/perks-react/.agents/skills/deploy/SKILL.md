---
name: deploy
description: Use when the user asks to deploy, resume, recover, or promote Firebase application surfaces to staging or production
---

# Deploy Skill

Canonical procedure: `.agents/workflows/deploy.md`

## Overview

Deploy one authorized target from one exact source identity through immutable,
surface-specific checkpoints. Keep working through deterministic recovery; ask
the user only when continuing requires a new production decision or authority.

## Core Invariants

- Only `/deploy` may run production deploy commands. Require explicit
  acknowledgement of the production target before the first production write.
- For production, capture all three live Web markers before any deploy command,
  resolve `PROD_REF`, and compare `PROD_REF..TARGET_REF` plus deploy-relevant
  dirty files. Never infer production from the local version or branch alone.
- A staging artifact is source-bound evidence, not production Web bytes. Vite
  embeds its Firebase environment, so rebuild and freeze Web with
  `.env.production` from the exact selected SHA.
- Every scope uses frozen deploy inputs and a stable run ID. Resume re-verifies
  the recorded SHA, target, build time, resources, artifact digest, deploy-input
  digest, and live-marker safety; it never rebuilds.
- Production full deploys are surface-sequenced: required index gate, Functions
  and callable verification, Firestore rules, Storage rules, then Hosting and
  live-marker verification. Give each surface a deterministic child run ID.
- Never pass `--force` to a multi-surface Firebase deploy. For an authorized
  parity cleanup, compare local/generated and remote Function manifests, print
  the deletion plan, and delete only the exact approved Function names. Then
  deploy Functions normally.
- A required Firestore index must finish building before dependent Functions or
  Hosting goes live.
- Hosting is verified by its live build marker, not HTTP 200. Production Web
  must agree on `perks-react.web.app`, `perks-react.firebaseapp.com`, and
  `perkmon.app`.
- Admin Hosting and card assets are explicit separate surfaces. Do not include
  them in Web/full deploys unless requested.
- Full completion is surface-specific. Do not turn a partial recovery into
  “full deploy complete” until every requested surface has fresh evidence.

## Failure Classification

**A hard stop pauses production mutation; it does not end investigation.**
Continue read-only diagnosis and preserve all checkpoints.

### Continue automatically without asking the user

- Fix an in-scope deterministic deploy-tool or test-harness defect, rerun the
  focused check, and resume the same checkpoint.
- Correct and retry a read-only verification invocation.
- Reconcile a Firebase CLI timeout/nonzero against authoritative Function or
  Cloud Run state. If the intended revision is Ready and callable smoke passes,
  record that surface as verified and continue.
- Resume only failed or pending surfaces. Do not rebuild a verified artifact or
  redeploy a verified backend because an aggregate command returned nonzero.

### Pause and ask the user only when

- Project, target branch/SHA, requested surface, or destructive deletion set is
  ambiguous.
- A live marker is missing, malformed, inconsistent, or differs from both the
  checkpoint baseline and frozen artifact.
- Artifact/deploy-input digest, target identity, or resume binding mismatches.
- Continuing needs a new secret, permission, billing decision, data deletion,
  index/config choice, or scope expansion.
- Remote state remains ambiguous or unhealthy after bounded reconciliation.

Do not ask for approval of a mechanical fix inside the authorized deploy. Do
not treat persistence as permission to cross a condition in the second list.

## Quick Reference

| Situation | Action |
|---|---|
| Staging full | Canonical staging full command; backend before Hosting |
| Release-tagged staging delta | `npm run deploy:staging:delta -- --target <tag>` |
| Production full/current branch | Surface children: indexes if required, Functions, Firestore rules, Storage, Hosting |
| Exact staging promotion | Run promotion `--plan`, require exact staging SHA/evidence, then use production surface children |
| Active failed child | Same child run ID plus `--resume` |
| Firebase Function timeout | Read remote revision/Cloud Run state, then callable smoke |
| Authorized stale Functions | Exact-name `firebase functions:delete`; never multi-surface `--force` |
| Unexpected live marker | Pause writes, preserve checkpoint, diagnose and ask |

## Execution

1. Read `.agents/workflows/deploy.md` and `.agents/conventions.md`.
2. Resolve the requested target and surfaces. Capture the current branch, full
   SHA, dirty deploy-relevant files, project ID, and stable run ID.
3. For production, read the three live markers. Prefer marker `releaseTag`;
   otherwise derive `v<appVersion>` and label it version-derived. Verify the ref
   exists and classify `PROD_REF..TARGET_REF`.
4. For a staging-verified promotion, run:

   ```bash
   npm run deploy:prod:promote -- \
     --staging-run-id "<id>" \
     --prod-ref "<PROD_REF>" \
     --plan
   ```

   Require exact staging `releaseSha`, artifact/deploy-input digests, backend,
   marker, strict/deep QA, tracker, and promotion evidence. Never reuse staging
   Web bytes.
5. Classify index dependency from declared index changes, new query shapes, and
   missing-index evidence. Run the workflow’s dedicated frozen index gate when
   required and wait for remote completion.
6. Before Functions, run manifest/env reconciliation. Only an allowlisted
   boolean whose source default is `false` may be added mechanically as
   `false`; unknown missing params, duplicates, invalid values, and
   secret/config requirements remain blockers.
7. For production full, follow the workflow’s child sequence with stable IDs:
   `functions`, `firestore-rules`, `storage`, then `hosting`. Skip or resume
   each child from its own checkpoint and remote evidence. Do not use the
   monolithic `npm run deploy:prod` compatibility command.
8. Keep Hosting last. Immediately before each Hosting body, recheck that the
   live marker equals the captured baseline or this frozen artifact.
9. Run the workflow’s surface-specific postchecks: callable access, active
   ruleset digest, Firestore operations/index readiness, three Web markers, and
   retained service-worker assets as applicable.
10. Report every requested and skipped surface separately, including baseline,
    target SHA, diff classification, run/checkpoint IDs, digests, build ID,
    recovery/reconciliation evidence, and cleanup state.

## Common Mistakes

| Mistake | Correct response |
|---|---|
| “Any failed test means ask the user” | Pause writes, fix deterministic in-scope defects, rerun, continue |
| “CLI nonzero means every Function failed” | Reconcile each reported remote revision and smoke it |
| “Use full `--force` to match staging” | Delete only the exact authorized Function names |
| “Retry full after Hosting failed” | Resume only the Hosting child with the same frozen artifact |
| “Staging passed, so copy its `dist`” | Rebuild production Web from the exact verified SHA |
| “HTTP 200 proves Hosting deployed” | Require exact live marker and retained-asset verification |

## Red Flags

- Production project or SHA is assumed rather than proven
- A newer/unknown marker would be overwritten
- A resume rebuilds or changes frozen bytes
- `--force` appears on a multi-surface deploy
- Hosting proceeds before required indexes or backend verification
- A partial aggregate checkpoint is reported as full success

Any red flag pauses production writes while diagnosis continues.
