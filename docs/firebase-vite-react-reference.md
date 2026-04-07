> Canonical standard for this repo's Firebase + Vite + React baseline.
>
> This repository is adopting these rules in phases. When current code disagrees with this guide, treat this guide as the intended default unless a project-specific exception is documented.

# Firebase + Vite + React Reference Guide

This guide is for internal teams starting or standardizing a web-first `Firebase + Vite + React` project.

It is intentionally opinionated. The goal is not to list every possible option, but to capture a small set of defaults that prevent the failures teams usually hit later: unsafe environment drift, inconsistent Firebase wiring, bad Firestore writes, ad hoc async state, weak local test loops, and one-off scripts that turn into deployment hazards.

## Recommended Defaults

### Environment and Safety

#### 1. Use one typed environment module

Create a single module that owns all reads from `import.meta.env`, validates required keys, exposes typed helpers, and hides raw environment names from the rest of the app.

Standard:
- Read `import.meta.env` in one place only
- Export helpers such as `isDev()`, `isStaging()`, `isProd()`, `shouldUseEmulators()`, and `cfg()`
- Fail immediately if required Firebase config is missing

Why:
- This prevents env parsing logic from spreading across the codebase
- It keeps build-time and runtime assumptions consistent

#### 2. Treat local, staging, and production as separate environments

Do not collapse everything into "dev" and "prod". Keep local emulator work separate from hosted staging and hosted production.

Standard:
- Local development uses emulators
- Staging uses real hosted services but stays separate from production
- Production never shares config or safety switches with local

Why:
- Most Firebase mistakes come from environment ambiguity, not missing features

#### 3. Fail fast on unsafe hosted builds

Import a safety module at the top of the main entrypoint so hosted builds abort before the app initializes.

Standard:
- Run hosted safety checks before any other app imports
- Refuse to start when emulators are enabled in staging or production
- Refuse to start when hosted Firebase config is incomplete

Why:
- Teams should not rely on deploy discipline alone to catch dangerous configuration

### Firebase Initialization

#### 4. Centralize Firebase initialization in one module

Initialize Firebase once and export typed service instances from a single place.

Standard:
- Initialize `app`, `auth`, `db`, and `functions` in one module
- Put emulator connection logic in that same module
- Do not reconnect emulators or reinitialize services in feature code

Why:
- Multiple Firebase entrypoints drift quickly and create hard-to-debug environment bugs

#### 5. Gate optional services by environment and runtime support

Services such as Analytics, App Check, or Performance Monitoring should only initialize when the current runtime actually supports them and the current environment should use them.

Standard:
- Guard browser-only services behind runtime capability checks
- Skip optional hosted-only services when using emulators
- Keep optional initialization non-blocking for app startup

Why:
- Optional Firebase services often fail in local, test, or unsupported browser contexts first

### Firestore Write Discipline

#### 6. Never write `undefined` into Firestore

Firestore rejects `undefined` values. Make this a hard rule.

Standard:
- Use conditional field inclusion for truly optional fields
- Use `null` when the field is intentionally present but empty
- Clean payloads before writing if they are assembled dynamically

Why:
- This is a recurring source of avoidable runtime failures in both app code and scripts

#### 7. Keep Firestore access behind feature APIs and hooks

React components should not build document paths, call SDK methods directly, or map raw Firestore data inline.

Standard:
- Put Firebase reads and writes in feature APIs, hooks, or service modules
- Return app-facing models rather than raw SDK snapshots wherever practical
- Keep components focused on rendering, interaction, and local UI state

Why:
- This keeps Firebase concerns testable and stops data shape decisions from leaking through the UI tree

#### 8. Default admin and migration scripts to dry-run mode

One-off scripts should be safe by default and require an explicit flag to write.

Standard:
- Default to read-only analysis
- Require an explicit `--fix` or equivalent flag before mutating Firestore
- Log the target project and action mode at startup
- Use conservative batch sizes and commit in chunks before hitting Firestore limits

Why:
- Production data scripts fail most often because the script was too easy to run in write mode

### App Architecture

#### 9. Use React Query for async server state

Use TanStack Query for data fetching, mutation status, invalidation, and cache-driven refetching instead of ad hoc `useEffect` fetch logic.

Standard:
- Fetch and mutate remote state through query and mutation hooks
- Keep invalidation behavior close to the mutation
- Reserve component state for view state, forms, and short-lived interaction state

Why:
- Async behavior stays more predictable when cache policy and loading state are handled consistently

#### 10. Keep side effects inside hooks and providers

Components should stay as close to pure rendering as possible.

Standard:
- Put subscriptions, bootstrapping, storage sync, and external listeners in hooks or providers
- Keep entrypoint boot code explicit and ordered
- Avoid mixing rendering logic with environment setup or service initialization

Why:
- This makes app startup and lifecycle behavior easier to reason about and test

### UX Conventions

#### 11. Do not use `alert()` or `confirm()`

Use standard in-app feedback primitives instead.

Standard:
- Use toast notifications for success, error, warning, and informational feedback
- Use a shared confirmation modal for destructive or irreversible actions
- Keep the feedback pattern consistent across features

Why:
- Browser primitives are inconsistent, hard to style, and produce a fragmented user experience

### Testing and Operational Workflows

#### 12. Make the emulator path the default local workflow

Local development should be able to exercise the main app loop without touching hosted Firebase.

Standard:
- Default development to local emulators
- Make it easy to start the app and emulators together
- Seed deterministic local data for repeatable tests and debugging

Why:
- Teams ship faster when local development does not depend on hosted data or shared staging state

#### 13. Separate test layers by responsibility

Do not flatten all tests into one bucket called "coverage".

Standard:
- `unit`: pure helpers, serializers, reducers, isolated hooks
- `contract`: API boundaries, callable inputs/outputs, Firestore rules, schema validation
- `integration`: rendered components, providers, and multi-module flows
- `e2e`: core user journeys through the running app

Why:
- Different layers catch different failure modes, and teams make worse decisions when all test output is reported the same way

#### 14. Define a small core-journey regression lane

Pick the handful of journeys that must stay green for nearly every change and make them cheap to run locally.

Standard:
- Identify the main product loop
- Keep one focused regression command for that loop
- Prefer outcome assertions over page-load smoke tests

Why:
- Broad suites are useful, but teams need a fast signal that maps to real user value

#### 15. Keep one-off operational scripts out of runtime build paths

Do not place ad hoc Firestore, backfill, or migration scripts inside directories that are part of the production runtime lint/build path unless they truly belong to the shipped app.

Standard:
- Store one-off scripts in a dedicated operational directory
- Keep runtime source directories limited to shipped code
- Document how scripts authenticate, dry-run, and apply changes

Why:
- Operational scripts frequently break CI, linting, or deploys when they live beside runtime code

## Default Project Setup Checklist

Use this as the starting baseline for a new project:

- Add `development`, `staging`, and `production` environment modes
- Create one typed env module and ban scattered raw env reads
- Import a hosted-safety guard before the app bootstraps
- Centralize Firebase initialization and emulator wiring in one module
- Use TanStack Query for remote async state
- Establish a shared toast pattern and a shared confirmation modal
- Make emulator-backed local development the default path
- Add separate commands for unit, rules/contract, and e2e coverage
- Define one local core-journey regression command
- Keep admin and migration scripts in a dedicated non-runtime directory
- Make data scripts dry-run by default and require an explicit write flag

## Things That Break Teams Later

- Letting multiple files read and interpret environment variables independently
- Allowing staging or production to boot with emulator flags still enabled
- Initializing Firebase services in more than one place
- Passing raw Firestore SDK objects or snapshots deep into components
- Writing `undefined` into Firestore payloads assembled from optional form values
- Treating smoke tests as if they prove product behavior
- Running data fixes from scripts that default to write mode
- Storing one-off scripts inside runtime source directories and then fighting lint/build failures

## How To Use This Guide

Use this document as a canonical baseline, then add project-specific guidance separately for domains, compliance, or platform-specific behavior. Keep the shared rules stable and small. If a project needs to diverge, document the reason explicitly instead of silently bypassing the standard.
