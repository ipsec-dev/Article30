import { test, expect } from './fixtures';

test.describe('DSR admin', () => {
  test('list page loads', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/dsr');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    // Either an empty state or the table header columns
    await expect(
      page
        .getByText(/type|réf\.|personne|échéance|statut|aucune demande|nouvelle demande/i)
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('new DSR page loads', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/dsr/new');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 });
  });
});
