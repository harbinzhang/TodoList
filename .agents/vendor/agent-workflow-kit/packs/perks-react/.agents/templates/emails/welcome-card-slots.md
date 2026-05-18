# Welcome Card Slots Email

Use this template after a reviewed operational grant sets a user's permanent
`users/{uid}.cardSlots` value, normally to `20`.

## Subject

```text
Welcome to Perkmon - 20 card slots unlocked
```

## Body

```text
Hi {firstName},

Welcome to Perkmon, and thank you for trying the app.

We saw your question. Some features are still under development, so as a welcome bonus, we have upgraded your account to 20 card slots forever, free of charge.

I hope you enjoy using Perkmon. If you have any questions, suggestions, or run into anything confusing, please let us know. You can use Ask Log or Feedback in the app, and we will see it there.

Again, welcome to Perkmon.

Best,
The Perkmon Team
```

## Optional Card Request Add-On

Append this sentence after the welcome-bonus paragraph when the grant is bundled
with a requested card that has already been added and linked to the account:

```text
Thank you also for your new card request. The new credit card has been added to production and has been automatically linked to your account.
```

## Notes

- Replace `{firstName}` with the first word of `users.displayName` or the Auth
  display name. Use `there` if neither exists.
- Keep the subject plain ASCII so Gmail previews and search stay predictable.
- Do not send this email until the Firestore dry run and human review have
  confirmed the exact target user and slot value.
