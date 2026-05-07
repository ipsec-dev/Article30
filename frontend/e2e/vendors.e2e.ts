import { test, expect } from './fixtures';

test.describe('vendors', () => {
  test('list page loads', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/vendors');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('new vendor page loads', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/vendors/new');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 });
  });
});
