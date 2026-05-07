import { test, expect } from './fixtures';

const TEST_TREATMENT_NAME = `E2E CRM Treatment ${Date.now()}`;

test('admin creates a treatment through the 6-step wizard', async ({ loginAsAdmin }) => {
  const page = loginAsAdmin;
  await page.goto('/register/new');
  await expect(page.getByRole('heading', { level: 2, name: /identification/i })).toBeVisible();

  // --- Step 1: Identification ---
  await page.getByLabel(/nom du traitement|treatment name/i).fill(TEST_TREATMENT_NAME);
  await page.getByLabel(/finalité|purpose/i).fill('Gestion relation client');
  // Legal basis is the only Radix Select combobox on step 1.
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: /consentement|consent/i }).click();
  // Use anchored regex so we don't accidentally match the Next.js dev tools button.
  const nextButton = () => page.getByRole('button', { name: /^(suivant|next)$/i });
  await nextButton().click();

  // --- Step 2: Data ---
  await expect(page.getByRole('heading', { level: 2, name: /données|data/i })).toBeVisible();
  await page
    .getByRole('checkbox', { name: /^clients$/i })
    .first()
    .check();
  await nextButton().click();

  // --- Step 3: Recipients ---
  await expect(
    page.getByRole('heading', { level: 2, name: /destinataires|recipients/i }),
  ).toBeVisible();
  await nextButton().click();

  // --- Step 4: Security ---
  await expect(page.getByRole('heading', { level: 2, name: /sécurité|security/i })).toBeVisible();
  await page.getByLabel(/durée de conservation|retention period/i).fill('5 ans');
  await nextButton().click();

  // --- Step 5: Risk ---
  await expect(
    page.getByRole('heading', { level: 2, name: /risque|évaluation des risques|risk/i }),
  ).toBeVisible();
  await nextButton().click();

  // --- Step 6: Review + Submit ---
  await expect(
    page.getByRole('heading', { level: 2, name: /récapitulatif|summary|review/i }),
  ).toBeVisible();
  await expect(page.getByText(TEST_TREATMENT_NAME)).toBeVisible();
  await page.getByRole('button', { name: /^enregistrer$|^save$/i }).click();
  await page.waitForURL(url => !url.pathname.endsWith('/new'), { timeout: 10_000 });

  await page.goto('/register');
  await expect(page.getByText(TEST_TREATMENT_NAME)).toBeVisible();
});
