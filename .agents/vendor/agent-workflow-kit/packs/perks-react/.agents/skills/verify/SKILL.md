---
name: verify
description: Run all test suites (unit, TypeScript, build, E2E, Firestore rules) and report a pass/fail summary
---

# Verify Skill

Use this skill when the user asks to fully verify, run all tests, or do a comprehensive check of the codebase.

## Execution

Run the following steps, parallelizing where possible:

### 1. Unit tests

```bash
npm test
```

### 2. TypeScript type checking (parallel)

Frontend:
```bash
npx tsc --noEmit
```

Functions (install deps if needed):
```bash
cd functions && npm install --prefer-offline && npx tsc --noEmit
```

### 3. Production build and bundle budget

```bash
npm run bundle:check
```

### 4. E2E local tests

```bash
npm run test:e2e:local:auto
```

This auto-starts emulators, runs Playwright E2E tests, and shuts down.

### 5. Firestore rules tests

Wait until E2E tests finish (they share emulator ports), then run:

```bash
npm run test:rules
```

If port 8080 is still occupied, find and kill the leftover emulator process before retrying:

```bash
lsof -i :8080
kill <PID>
npm run test:rules
```

## Reporting

Report results in this table format:

```
| Test type                         | Result               |
|-----------------------------------|----------------------|
| Unit tests                        | X files, Y passed    |
| TypeScript (frontend + functions) | No errors / N errors |
| Production build + bundle budget  | Success / Failed     |
| E2E local                         | X passed             |
| Firestore rules                   | X passed             |
```

If any step fails, include the error summary and continue running remaining steps.

## Notes

- E2E and rules tests share Firebase emulator ports — do not run them in parallel.
- Unit tests, TypeScript checks, and `npm run bundle:check` can run in parallel.
- Functions `node_modules` may not exist in worktrees — install before type checking.
