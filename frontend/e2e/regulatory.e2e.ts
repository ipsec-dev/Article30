import { test, expect } from './fixtures';

test.describe('regulatory + reference pages', () => {
  for (const route of ['/regulatory-updates', '/articles', '/recitals', '/iso']) {
    test(`${route} loads`, async ({ loginAsAdmin }) => {
      const page = loginAsAdmin;
      await page.goto(route);
      await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
        timeout: 10_000,
      });
    });
  }
});
