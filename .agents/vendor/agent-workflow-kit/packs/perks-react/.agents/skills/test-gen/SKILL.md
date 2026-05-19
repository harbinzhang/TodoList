---
name: test-gen
description: Generate unit, integration, or E2E tests for uncovered or under-tested code by analyzing source files and matching existing test patterns in the project
---

# Test Generation

Use this skill when the user asks to add tests for existing code, improve coverage for a feature, or create tests for a new module.

## Workflow

### 1. Analyze the target

- Read the source file(s) to understand the public API, props, hooks, side effects, and edge cases.
- Check if tests already exist in the co-located `__tests__/` directory.
- If tests exist, read them to match the existing style, assertions, and mock patterns.

### 2. Determine the test layer

| Target | Layer | Framework | Location |
|---|---|---|---|
| Utility function, pure logic | Unit | Vitest | `src/<path>/__tests__/<name>.test.ts` |
| React hook | Unit/Integration | Vitest + renderHook | `src/<path>/hooks/__tests__/<name>.test.ts` |
| React component | Integration | Vitest + React Testing Library | `src/<path>/components/__tests__/<name>.test.tsx` |
| API call / Firestore interaction | Contract | Vitest | `src/<path>/api/__tests__/<name>.test.ts` |
| Multi-page user flow | E2E | Playwright | `e2e/tests/<feature>.spec.ts` |

### 3. Generate tests

Follow these templates based on layer:

**Unit test template:**
```typescript
import { describe, it, expect } from 'vitest'
import { functionName } from '../moduleName'

describe('functionName', () => {
  it('should return expected result for normal input', () => {
    expect(functionName(input)).toBe(expected)
  })

  it('should handle edge case', () => {
    expect(functionName(edgeInput)).toBe(edgeExpected)
  })
})
```

**Hook test template:**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useHookName } from '../useHookName'

vi.mock('firebase/auth', () => ({ /* relevant mocks */ }))

describe('useHookName', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useHookName())
    expect(result.current.value).toBe(initial)
  })
})
```

**Component test template:**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentName } from '../ComponentName'

vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }),
}))

describe('ComponentName', () => {
  it('should render the main content', () => {
    render(<ComponentName />)
    expect(screen.getByText('Expected text')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<ComponentName />)
    await user.click(screen.getByRole('button', { name: 'Action' }))
    expect(screen.getByText('Result')).toBeInTheDocument()
  })
})
```

**E2E test template:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('@pr should complete the core flow', async ({ page }) => {
    await page.goto('/feature-path')
    await expect(page.getByTestId('main-element')).toBeVisible()

    await page.getByRole('button', { name: 'Action' }).click()
    await expect(page.getByText('Success')).toBeVisible()
  })
})
```

### 4. Prioritize test cases

Generate tests in this priority order:

1. **Happy path** — the main expected behavior
2. **Error/empty states** — what happens when data is missing, API fails, or user is unauthorized
3. **Edge cases** — boundary values, empty arrays, null inputs
4. **User interactions** — clicks, form submissions, navigation
5. **Loading states** — skeleton screens, spinners, disabled buttons during async ops

### 5. Run and verify

```bash
# Unit/integration
npx vitest run --reporter=verbose <test-file>

# E2E
npx playwright test <spec-file> --grep "@pr"

# Coverage check (optional)
npm run test:coverage
```

Ensure all generated tests pass before finishing.

## Conventions

- **Imports**: Use `@/` path alias for `src/` imports in test files.
- **Mocking**: Use `vi.mock()` at the top of the file. Use `vi.hoisted()` when mock values are needed before module evaluation.
- **Firebase mocks**: Mock `firebase/auth`, `firebase/firestore`, etc. at the module level. Never call real Firebase in unit tests.
- **Test data**: For E2E tests, use IDs from `e2e/seed-emulator.mjs` for deterministic data.
- **Tags**: Always tag E2E tests with `@pr` at minimum. Add `@journey-core` for core user loop tests.
- **Selectors**: Prefer `getByRole`, `getByText`, `getByTestId` in that order. Add `data-testid` to source if needed.
- **No snapshots**: Avoid snapshot tests for components — they break on every render change and provide low signal.

## Rules

- Match the existing test style in the codebase. Read nearby `__tests__/` files first.
- Do not generate tests that only assert the component renders without crashing — every test should verify meaningful behavior.
- Do not over-mock. If a dependency is simple and deterministic, use the real implementation.
- Remove any `console.log` debug statements before finishing.
- If generating tests reveals that the source code needs `data-testid` attributes, add them.
