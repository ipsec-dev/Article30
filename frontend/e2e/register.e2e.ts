import { test, expect } from './fixtures';

test.describe('register', () => {
  test('list page loads', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/register');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    // EmptyState title (no treatments yet) OR table headers
    await expect(
      page.getByText(/aucun traitement|réf\.|nom|nouveau traitement/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('new treatment page loads', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/register/new');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 });
  });
});
