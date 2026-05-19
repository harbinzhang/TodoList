---
name: local-emulator-admin-setup
description: Set up local Firebase emulators with a seeded admin test account and real card products for local testing
---

# Local Emulator Admin Setup

Bootstrap the Firebase Auth and Firestore emulators with an admin account and real card product data for local agent testing.

## Prerequisites

Firebase emulators must be running:
- Auth emulator on `http://localhost:9099`
- Firestore emulator on `http://localhost:8080`

## Seed Script

```
node e2e/seed-local-agent-data.mjs
```

**File**: `e2e/seed-local-agent-data.mjs`

### What it does
1. Waits for both emulators to be reachable
2. Deletes the existing admin user if present (idempotent)
3. Creates the admin Auth account and verifies the email
4. Writes the admin user profile to Firestore (`users/{uid}`) with `role: admin`
5. Seeds `LOCAL_SEED_CARD_COUNT` card products (default: 5) from `src/data/card-products/cards/` into `cards/`, `cardBenefits/`, and `userCards/`
6. Seeds `config/homeBanner` with a local-test banner (including `message` Markdown content)
7. Writes context output to `e2e/.agent/local-testing-context.json` and `e2e/.agent/local-testing-context.md`

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
- `e2e/.agent/local-testing-context.md` — human/agent-readable summary with credentials and seeded card list

## Troubleshooting

- **"Emulator not reachable"** — run `firebase emulators:start` first
- **Re-running is safe** — the script deletes and recreates the admin account each run (idempotent)
- **Card data source** — cards are loaded from `src/data/card-products/cards/*.json`; the selection is deterministic based on the admin email/password hash
