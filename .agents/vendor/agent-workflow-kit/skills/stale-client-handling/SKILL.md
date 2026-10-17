---
name: stale-client-handling
description: Detect, classify, record, and safely mitigate suspected writes from outdated application clients using repository-provided monitoring, outreach, and repair hooks.
---

# Stale Client Handling

Use this skill when monitoring suggests that an outdated browser, mobile app,
or API client is writing legacy or malformed data.

## Safety

- Treat production as read-only unless the user explicitly authorizes a named
  outreach or repair action in the current turn.
- Never infer authorization from permission to investigate.
- Prefer hashed stable identifiers in tracked history. Keep raw identifiers,
  credentials, and personal data out of repository files.
- Run repair tools in dry-run mode first and show their exact scope before
  requesting write authorization.

## Discover repository hooks

Read `.agents/repo-profile.yaml`, repository conventions, monitoring scripts,
and operational docs. Identify:

- the read-only health or user-level investigation command;
- fields that distinguish current from legacy clients;
- a tracked hashed history file, when one exists;
- an approved outreach procedure;
- a dry-run repair command and its explicit write flags.

If a required hook is absent, do not invent a command or data path. Return an
`evidence insufficient` classification and name the missing hook.

## Workflow

1. Start from the narrowest existing report and map the suspicious write to
   its client/version evidence and affected record.
2. Classify it as `likely`, `possible`, `not supported`, or
   `evidence insufficient`. Separate observed evidence from inference.
3. Hash the subject identifier using the repository's established algorithm
   before recording durable history. Check whether the same pattern was seen
   and handled before.
4. For an unhandled likely or possible case, recommend the repository's
   approved refresh/update outreach. Do not send it without explicit approval.
5. Select the narrowest existing repair tool, run dry-run, and review affected
   records. Run write flags only after explicit approval.
6. Re-run the original monitor after any authorized action and append a
   timestamped, hashed outcome to the established history file.

## Report

```text
Stale client classification: likely | possible | not supported | evidence insufficient
seen before: yes | no | unknown
handled: outreach sent | cleanup observed | not yet | unknown
newly recorded: yes | no
evidence:
- ...
recommended next step:
- ...
reports:
- ...
```
