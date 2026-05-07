import { test, expect } from './fixtures';

test.describe('checklist + screening', () => {
  test('checklist page loads', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/checklist');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('screening list loads', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/checklist/screening');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('screening new page loads', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/checklist/screening/new');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 });
  });
});
