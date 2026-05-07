import { test, expect } from './fixtures';

test.describe('dashboard', () => {
  test('loads without crashing', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/');
    // Wait for sidebar
    await expect(page.getByText(/^Article30$/).first()).toBeVisible({ timeout: 10_000 });
    // No crash dialog
    await expect(page.getByRole('dialog', { name: /runtime|typeerror/i })).not.toBeVisible();
  });

  test('shows greeting in HeroBand', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/');
    await expect(page.getByText(/bonjour/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows KpiGrid', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/');
    await expect(page.getByText(/traitements validés/i)).toBeVisible({ timeout: 10_000 });
  });
});
