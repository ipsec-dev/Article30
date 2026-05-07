import { test, expect } from './fixtures';

test.describe('DSR public submit', () => {
  test('unauthenticated visitor can submit a data subject request', async ({ page }) => {
    await page.goto('/dsr/submit');

    // Prime the XSRF-TOKEN cookie: the backend CSRF middleware only sets the
    // cookie on a request it actually sees, and Next.js serves the static
    // /dsr/submit page without a backend call.  A credentialed GET to any
    // backend route seeds the cookie before the submit POST.
    await page.evaluate(async () => {
      await fetch('/api/auth/me', { credentials: 'include' }).catch(() => {});
    });

    // Page title — "Exercer vos droits" (FR) / "Exercise your data rights" (EN).
    // CardTitle is rendered as a <div>, not a heading, so match by text.
    await expect(page.getByText(/exercer vos droits|exercise your data rights/i)).toBeVisible();

    // DSR type: native <select>. Default value is ACCESS; set explicitly for clarity.
    await page.getByLabel('Type').selectOption('ACCESS');

    await page.getByLabel(/nom du demandeur|requester name/i).fill('Jane Doe');
    await page
      .getByLabel(/email du demandeur|requester email/i)
      .fill(`jane.${Date.now()}@example.test`);
    await page
      .getByLabel(/^description$/i)
      .fill('Je souhaite obtenir une copie de mes données personnelles.');

    // Submit button is labelled with t('common.create') → "Créer" / "Create".
    // Anchor the regex to avoid matching the Next.js dev-tools buttons.
    await page.getByRole('button', { name: /^(créer|create)$/i }).click();

    // Success is rendered as an inline green confirmation div containing the
    // reference id from the backend (`Référence : <uuid>`).
    await expect(
      page.getByText(/votre demande a été reçue|your request has been received/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
