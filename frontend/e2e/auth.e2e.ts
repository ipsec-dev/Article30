import { test, expect } from './fixtures';

const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASSWORD = 'Admin-Passw0rd!';

async function freshLogin(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.evaluate(async () => {
    await fetch('/api/auth/me', { credentials: 'include' }).catch(() => {});
  });
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/mot de passe|password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /se connecter|sign in|login/i }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 30_000 });
}

test.describe('auth flow', () => {
  test('admin can log in via the form and see the dashboard', async ({ page }) => {
    // Exercises the login UI directly without using the shared storageState
    // session — genuinely covers the form submit path.
    await freshLogin(page);
    await expect(page.getByText(/^Article30$/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('admin can log out and is redirected to /login', async ({ page }) => {
    // Use a private session for logout: the shared storageState session is
    // reused across all the smoke specs and must NOT be destroyed.
    await freshLogin(page);
    const logoutButton = page.getByRole('button', { name: /déconnexion|logout/i }).first();
    await logoutButton.click();
    await page.waitForURL(/\/login/, { timeout: 15_000 });
  });

  test('redirects unauthenticated users to /login for protected routes', async ({ page }) => {
    await page.goto('/register');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });
});
