# Grant Welcome Card Slots

Use this workflow when a specific user should receive a permanent welcome-bonus
tracking-slot grant, usually `20` slots, and a matching manual welcome email.

This workflow is production-affecting. Always dry run first, get human approval,
then apply the write and send the email. Never bulk-update users from this
workflow.

## Scope

- Writes only `users/{uid}.cardSlots` and `users/{uid}.updatedAt`.
- Does not create or update `userCards`, `cardRequests`, or tracking docs.
- Does not send the email automatically; prepare the draft from the template and
  send only after review.
- If a card request is also being approved or linked, handle that through the
  card-request/card-linking flow separately, verify the card exists in
  production and is linked to the account, then use the optional add-on line in
  the email.

## Canonical Template

Email template:

```text
.agents/templates/emails/welcome-card-slots.md
```

Default subject:

```text
Welcome to Perkmon - 20 card slots unlocked
```

## Dry Run

Run from the repo root:

```bash
cd functions && npx ts-node --project tsconfig.json ../exp/functions-scripts/grant-user-card-slots.ts --email=USER_EMAIL --slots=20
```

If the current value is known, add an expectation so drift blocks the later fix:

```bash
cd functions && npx ts-node --project tsconfig.json ../exp/functions-scripts/grant-user-card-slots.ts --email=USER_EMAIL --slots=20 --expected-current=5
```

Review and report:

- resolved Auth user and Firestore `users/{uid}` doc
- current `cardSlots`
- target `cardSlots`
- `walletCardCount`
- whether the script would update the user doc
- generated email subject/body
- any blockers

## Human Approval Gate

Before write mode, the human must approve all of these:

- target email and UID
- current slot value and target slot value
- whether the grant is intended to be permanent
- final email subject/body

Do not infer approval from an earlier dry-run request.

## Apply

After approval:

```bash
cd functions && npx ts-node --project tsconfig.json ../exp/functions-scripts/grant-user-card-slots.ts --email=USER_EMAIL --slots=20 --expected-current=CURRENT_VALUE --fix
```

The script blocks accidental decreases unless `--allow-decrease` is explicitly
provided. Do not use `--allow-decrease` for a welcome grant.

## Send Email

Use the canonical template to create or send the Gmail message. If Gmail tooling
is unavailable, report that limitation and provide the exact subject/body for
manual sending.

Do not use the automated card-request approved template for this welcome grant;
that template is tied to `cardRequests` status transitions and has different
copy.

If the email mentions a requested card being added to production and linked,
verify those writes first. Do not send that wording from a plan or intended
future action.

## Post-Check

After write and send:

1. Re-run the script without `--fix` to confirm `currentCardSlots` is the target
   value and `wouldUpdateUserDoc` is false.
2. If Gmail tooling was used, confirm the draft/send result. If sent manually,
   record that manual send was outside the repo/tooling evidence.
3. Summarize the UID, before/after slots, email subject, and whether the email
   was sent or only drafted.

## Semantics

`users.cardSlots` is the persistent tracking-slot count for non-Pro behavior.
Pro users may temporarily see the higher wallet-card limit while Pro is active,
but this stored value remains the user's fallback slot count if Pro lapses.
