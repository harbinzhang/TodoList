---
name: tdd
description: Drive feature work or bug fixes using a Red-Green-Refactor test-driven development cycle with Vitest for unit/integration and Playwright for E2E tests
---

# Test-Driven Development

Use this skill when implementing new features, fixing bugs, or refactoring with a test-first approach.

## Workflow

### 1. Understand the requirement

- Clarify the expected behavior before writing any code.
- Identify which test layer is appropriate:
  - **Unit** (Vitest): isolated logic, utilities, hooks, pure functions
  - **Integration** (Vitest + React Testing Library): components with providers, multi-module flows
  - **E2E** (Playwright): full browser journeys, auth flows, multi-page interactions
- Follow the test pyramid: ~80% unit, ~15% integration, ~5% E2E.

### 2. RED — Write a failing test first

Write the smallest test that captures the requirement. Do not write production code yet.

**Unit/Integration test pattern** (Vitest):
```typescript
import { describe, it, expect, vi } from 'vitest'

describe('featureName', () => {
  it('should behave as expected when given X', () => {
    // Arrange
    // Act
    // Assert — one logical assertion per test
  })
})
```

**E2E test pattern** (Playwright):
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Journey', () => {
  test('@pr @journey-core should complete the flow', async ({ page }) => {
    await page.goto('/path')
    await expect(page.getByTestId('element')).toBeVisible()
  })
})
```

**Conventions:**
- Place unit/integration tests in `src/<feature>/**/__tests__/` next to the source.
- Place E2E tests in `e2e/tests/`.
- Tag E2E tests: `@pr` for emulator-safe, `@journey-core` for core loops, `@release` for staging, `@prod` for read-only production smoke.
- Use `data-testid` attributes for stable E2E selectors.

Run the test and confirm it fails for the right reason:
```bash
npx vitest run --reporter=verbose <test-file>        # unit/integration
npx playwright test <spec-file> --grep "@pr"          # E2E
```

### 3. GREEN — Make the test pass

Write the minimum production code to make the failing test pass. No more, no less.

**Firebase mocking pattern:**
```typescript
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))
```

**React component testing pattern:**
```typescript
import { render, screen } from '@testing-library/react'

// Wrap with necessary providers
render(<Component />, { wrapper: TestProviders })
await screen.findByText('Expected text')
```

Re-run the test and confirm it passes.

### 4. REFACTOR — Clean up while green

With tests passing, improve the code:
- Remove duplication
- Simplify logic
- Extract helpers only if reused
- Do not change behavior — tests must stay green

Re-run all related tests after refactoring:
```bash
npx vitest run --reporter=verbose                     # all unit tests
npm run test:journeys:unit                            # journey unit tests
```

### 5. Repeat

Continue the Red-Green-Refactor cycle until the feature is complete.

### 6. Verify the full suite

Before finishing, run the broader test surface:
```bash
npm run test                    # all unit/integration tests
npm run test:e2e:pr             # emulator-safe E2E tests (if E2E was added)
```

## Bug Fix Pattern — The Proves-It Test

For bug fixes, always write a test that reproduces the bug first:

1. Write a test that fails because of the bug (RED)
2. Fix the bug (GREEN)
3. The test now serves as a regression guard

## Rules

- Test behavior and outcomes, not implementation details. Avoid asserting on internal state or mock call counts when possible.
- Prefer DAMP (Descriptive And Meaningful Phrases) over DRY in tests — clarity matters more than deduplication.
- One logical assertion per test. Multiple `expect` calls are fine if they assert a single concept.
- Do not mock what you do not own unless at system boundaries (Firebase, network, localStorage).
- Use `e2e/seed-emulator.mjs` seed IDs for deterministic E2E test data.
- Remove debug `console.log` calls before finishing.
