import { test, expect } from '@playwright/test';

test('core task flow stays green', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Email address').fill('local@example.com');
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();

  await page.getByRole('button', { name: 'Add task' }).first().click();
  await page.getByPlaceholder('Try: "Buy groceries tomorrow p2 #Personal"').fill('Core journey task p2');
  await page.getByRole('button', { name: 'Add task' }).last().click();

  await expect(page.getByText('Core journey task')).toBeVisible();

  await page.getByText('Core journey task').click();
  await page.locator('input[value="Core journey task"]').fill('Core journey task updated');
  await page.locator('input[value="Core journey task updated"]').blur();
  await page.getByText('Core journey task updated').click();

  await page.getByRole('button').filter({ has: page.locator('svg') }).first().click();
  await page.reload();

  await expect(page.getByText('Core journey task updated')).toBeVisible();
});
