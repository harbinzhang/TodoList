import { test, expect } from '@playwright/test';

test('core task flow stays green', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Email address').fill('local@example.com');
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();

  await page.getByRole('button', { name: 'Open quick add task form' }).click();
  await page.getByPlaceholder('Try: "Buy groceries tomorrow p2 #Personal"').fill('Core journey task p2');
  await page.getByRole('button', { name: 'Add task' }).last().click();

  const createdTask = page.getByRole('heading', { name: 'Core journey task' });
  await expect(createdTask).toBeVisible();

  await createdTask.click();
  await page.locator('input[value="Core journey task"]').fill('Core journey task updated');
  await page.locator('input[value="Core journey task updated"]').blur();
  const updatedTask = page.getByRole('heading', { name: 'Core journey task updated' });
  await expect(updatedTask).toBeVisible();
  await page.getByRole('button', { name: 'Close task detail panel' }).click();
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Core journey task updated' })).toBeVisible();
});
