import { test, expect } from '@playwright/test';

test.describe('PR10: task detail dual-view modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email address').fill('local@example.com');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  });

  /** Hover the task card by its title and click the scoped expand button. */
  async function openDetailModal(page: import('@playwright/test').Page, taskTitle: string) {
    const taskCard = page.locator('.group').filter({ hasText: taskTitle }).first();
    await taskCard.hover();
    // force:true bypasses Playwright's pointer-events stability check; the button has
    // pointer-events:none until group:hover activates, and headless Chromium can lose
    // :hover state during Playwright's click-stability polling when Firestore re-renders.
    await taskCard.getByTitle('Open detail').click({ force: true });
    await expect(page.getByText('Task Detail')).toBeVisible();
  }

  test('expand button appears on hover and opens full-screen modal', async ({ page }) => {
    const title = `PR10 expand ${Date.now()}`;
    await page.getByRole('button', { name: 'Open quick add task form' }).click();
    await page.getByPlaceholder('Try: "Buy groceries tomorrow p2 #Personal"').fill(title);
    await page.getByRole('button', { name: 'Add task' }).last().click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    // Pre-hover: button is in DOM but non-interactive — opacity:0 + pointer-events:none.
    const taskCard = page.locator('.group').filter({ hasText: title }).first();
    const expandBtn = taskCard.getByTitle('Open detail');
    await expect(expandBtn).toHaveCSS('opacity', '0');
    await expect(expandBtn).toHaveCSS('pointer-events', 'none');

    // Hover activates group-hover:pointer-events-auto.
    // We use evaluate() (a single synchronous check) rather than toHaveCSS() (polling)
    // so we capture the CSS state right after hover before headless Chromium can lose
    // :hover during Playwright's retry loop.
    await taskCard.hover();
    const pointerEventsAfterHover = await expandBtn.evaluate(
      (el) => getComputedStyle(el).pointerEvents,
    );
    expect(pointerEventsAfterHover).toBe('auto');

    // force:true for the click because :hover can be lost between evaluate() and click
    // when Firestore re-renders cause brief DOM instability.
    await expandBtn.click({ force: true });

    await expect(page.getByText('Task Detail')).toBeVisible();
    await expect(page.getByPlaceholder('Task name')).toHaveValue(title);
  });

  test('modal edit form updates task title on Save', async ({ page }) => {
    const title = `PR10 edit ${Date.now()}`;
    await page.getByRole('button', { name: 'Open quick add task form' }).click();
    await page.getByPlaceholder('Try: "Buy groceries tomorrow p2 #Personal"').fill(title);
    await page.getByRole('button', { name: 'Add task' }).last().click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    await openDetailModal(page, title);

    const updated = title + ' SAVED';
    await page.getByPlaceholder('Task name').fill(updated);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

    await page.getByTitle('Close').click();
    await expect(page.getByText('Task Detail')).not.toBeVisible();
    await expect(page.getByRole('heading', { name: updated })).toBeVisible();
  });

  test('dual-view toggles between list and mindmap', async ({ page }) => {
    const title = `PR10 toggle ${Date.now()}`;
    await page.getByRole('button', { name: 'Open quick add task form' }).click();
    await page.getByPlaceholder('Try: "Buy groceries tomorrow p2 #Personal"').fill(title);
    await page.getByRole('button', { name: 'Add task' }).last().click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    await openDetailModal(page, title);

    // Default: list view — subtask count and empty state visible
    await expect(page.getByText('0 subtasks')).toBeVisible();
    await expect(page.getByText('No subtasks yet.')).toBeVisible();

    // Switch to mindmap view → MindmapToolbar zoom button confirms TreeRenderer mounted
    await page.getByTitle('Mindmap view').click();
    await expect(page.getByTitle('Zoom in')).toBeVisible({ timeout: 5000 });

    // Switch back to list view
    await page.getByTitle('List view').click();
    await expect(page.getByText('No subtasks yet.')).toBeVisible();

    await page.getByTitle('Close').click();
  });

  test('modal close button dismisses without saving', async ({ page }) => {
    const title = `PR10 close ${Date.now()}`;
    await page.getByRole('button', { name: 'Open quick add task form' }).click();
    await page.getByPlaceholder('Try: "Buy groceries tomorrow p2 #Personal"').fill(title);
    await page.getByRole('button', { name: 'Add task' }).last().click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    await openDetailModal(page, title);

    // Modify title then close without saving
    await page.getByPlaceholder('Task name').fill('should not persist');
    await page.getByTitle('Close').click();

    // Original title is still in the list
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  });
});
