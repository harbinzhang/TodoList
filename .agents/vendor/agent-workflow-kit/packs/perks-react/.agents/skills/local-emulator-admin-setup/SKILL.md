---
name: local-emulator-admin-setup
description: Start or seed local Firebase emulators with an admin test account, real card products, and a local-safe all-features operational flag profile for agent testing
---

# Local Emulator Admin Setup

Bootstrap the Firebase Auth and Firestore emulators with an admin account, real
card product data, and local-safe operational flags for agent testing.

## Prerequisites

Firebase emulators must be running with the same project id as the local app.
The default local project id is `perks-react` (`LOCAL_FIREBASE_PROJECT_ID`).

Recommended one-command setup:

```
LOCAL_FIREBASE_PROJECT_ID=perks-react npm run emu:agent
```

Manual setup:

```
LOCAL_FIREBASE_PROJECT_ID=perks-react firebase emulators:start --project perks-react
```

Required emulator endpoints:
- Auth emulator on `http://localhost:9099`
- Firestore emulator on `http://localhost:8080`
- Functions emulator on `http://localhost:5001`

Do not start with plain `firebase emulators:start` in this repo unless your
active Firebase project is already `perks-react`. `.firebaserc` may point the
default project at staging (`perkly-staging-7dab8`), which makes local callable
URLs like `/perks-react/us-central1/saveCardProduct` return `not-found`.

## Seed Script

```
LOCAL_FIREBASE_PROJECT_ID=perks-react node e2e/seed-local-agent-data.mjs
```

**File**: `e2e/seed-local-agent-data.mjs`

### What it does
1. Waits for both emulators to be reachable
2. Deletes the existing admin user if present (idempotent)
3. Creates the admin Auth account and verifies the email
4. Writes the admin user profile to Firestore (`users/{uid}`) with `role: admin`
5. Seeds `LOCAL_SEED_CARD_COUNT` products (default: 5) from `src/data/card-products/cards/` and `src/data/membership-products/memberships/` into `cards/`, `cardBenefits/`, and `userCards/`
6. Seeds `config/flags` with the `local-safe-all-features` profile
7. Seeds `config/homeBanner` with a local-test banner (including `message` Markdown content)
8. Writes context output to `e2e/.agent/local-testing-context.json` and `e2e/.agent/local-testing-context.md`

## Operational Flag Profile

The default profile enables local product surfaces, including:

- Ask AI `value` pipeline, actions, slot filling, spend goals, `/add` Quick Add,
  multi-card proposals, task registry, potential-offer hints, canonical offer
  content, and the live planner
- Wishlist, featured benefits, language selection, calendar feeds, scoped
  tracker reads, Top Picks, service-worker prompts, and native pull-to-refresh

Keep delivery and infrastructure switches that can escape the emulator or
require unavailable workers disabled:

- Admin, reminder, test, and transactional email sends
- Push sends
- Tracking migration dispatch
- Benefit-signal delta cutover (it requires projection bootstrap while the flag
  is off)
- Benefit reminder campaign sends
- Email/push outbox rollout
- External price-watch sandboxing (`in-process` remains selected)

`disableScopedTrackerReads` is intentionally `false`; this opts into the scoped
tracker path despite the inverted flag name.

The canonical profile lives in `e2e/local-operational-flags.mjs`. When a new
operational flag is added, update that profile; the parity test fails until
every canonical flag has an explicit local value.

Run the parity test with:

```
npx vitest run scripts/__tests__/local-operational-flags.test.ts
```

## Credentials

| Field    | Default                    | Env override           |
|----------|----------------------------|------------------------|
| Email    | `seashore.real@gmail.com`  | `LOCAL_ADMIN_EMAIL`    |
| Password | `asdfasdf`                 | `LOCAL_ADMIN_PASSWORD` |

## Optional Environment Variables

| Variable                  | Default                        | Description                          |
|---------------------------|--------------------------------|--------------------------------------|
| `LOCAL_ADMIN_EMAIL`       | `seashore.real@gmail.com`      | Admin account email                  |
| `LOCAL_ADMIN_PASSWORD`    | `asdfasdf`                     | Admin account password               |
| `LOCAL_SEED_CARD_COUNT`   | `5`                            | Number of cards to seed (max 12)     |
| `LOCAL_AUTH_EMULATOR`     | `http://localhost:9099`        | Auth emulator base URL               |
| `LOCAL_FIRESTORE_EMULATOR`| `http://localhost:8080`        | Firestore emulator base URL          |
| `LOCAL_FIREBASE_PROJECT_ID`| `perks-react`                 | Firebase project ID                  |
| `LOCAL_SEED_OPERATIONAL_FLAGS`| `true`                   | Seed the local-safe `config/flags` profile; set `false` to preserve manual emulator values |
| `LOCAL_HOME_BANNER_ENABLED`| `true`                        | Whether `config/homeBanner` should be enabled |
| `LOCAL_HOME_BANNER_VERSION`| `local-seed-<timestamp>`      | Version used by dismiss/re-show logic |
| `LOCAL_HOME_BANNER_BADGE`  | `Local Seed`                  | Banner badge text                    |
| `LOCAL_HOME_BANNER_TITLE`  | `Local emulator banner is live`| Banner title                        |
| `LOCAL_HOME_BANNER_MESSAGE`| preset Markdown sample         | Banner Markdown message              |
| `LOCAL_HOME_BANNER_CTA_TEXT`| `View how-to`                | Banner CTA text                      |
| `LOCAL_HOME_BANNER_CTA_URL` | `/how-to-use`                | Banner CTA URL                       |
| `LOCAL_HOME_BANNER_CLOSABLE`| `true`                       | Whether users can dismiss banner     |

## Output

After seeding, context is written to:
- `e2e/.agent/local-testing-context.json` — machine-readable
- `e2e/.agent/local-testing-context.md` — human/agent-readable summary with credentials, seeded cards, and the operational flag profile

Verify the seeded account, first card, and operational flags:

```
bash .agents/skills/local-emulator-admin-setup/scripts/verify-agent-context.sh
```

## Troubleshooting

- **"Emulator not reachable"** — run `LOCAL_FIREBASE_PROJECT_ID=perks-react npm run emu:agent`
- **Callable upload returns `not-found`** — the Functions emulator is likely
  running under the wrong project id. Stop the emulator process and restart with
  `LOCAL_FIREBASE_PROJECT_ID=perks-react npm run emu:agent`, or manually run
  `firebase emulators:start --project perks-react`.
- **Ask AI `/add` does not show Quick Add** — verify `config/flags` was seeded,
  then fully reload the app. Operational flags may remain in the open tab's
  React Query cache.
- **Re-running is safe** — the script deletes and recreates the admin account each run (idempotent)
- **Preserve manual flags** — run with `LOCAL_SEED_OPERATIONAL_FLAGS=false`
- **Product data source** — cards are loaded from `src/data/card-products/cards/*.json` and memberships from `src/data/membership-products/memberships/*.json`; the selection is deterministic based on the admin email/password hash
