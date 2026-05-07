import { test, expect } from './fixtures';

test.describe('violations', () => {
  test('list page loads', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/violations');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('new violation page loads', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/violations/new');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 });
  });
});
