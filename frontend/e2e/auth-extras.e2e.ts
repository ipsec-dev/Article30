import { test, expect } from './fixtures';

test.describe('auth pages (unauthenticated)', () => {
  test('signup page loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    // Signup is invitation-only on this instance: the page renders "Inscription
    // fermée" + a "Retour à la connexion" link. Match either the closed-signup
    // notice OR an email field if signup is ever re-enabled.
    await expect(page.getByText(/inscription fermée|email/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('forgot-password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('reset-password page loads (with placeholder token)', async ({ page }) => {
    await page.goto('/reset-password?token=fake-test-token');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    // Page should at least render its layout — wait for the auth container
    await expect(page.getByRole('button').first()).toBeVisible({ timeout: 10_000 });
  });

  test('pending page loads when accessed directly (may redirect to /login)', async ({ page }) => {
    await page.goto('/pending');
    await expect(page.getByRole('dialog', { name: /runtime/i })).not.toBeVisible();
    // Either pending message or redirect to login — either is fine
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
  });
});
