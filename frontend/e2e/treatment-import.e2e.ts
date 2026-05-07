import * as XLSX from 'xlsx';
import { test, expect } from './fixtures';

function buildXlsxBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  const headers = [
    'name',
    'purpose',
    'legalBasis',
    'personCategories',
    'subPurposes',
    'retentionPeriod',
    'assignedToEmail',
  ];
  const rows = [
    headers,
    ['e2e-import-1', 'tested via playwright', 'CONSENT', 'employees', '', '3 years', ''],
    ['e2e-import-2', '', '', '', '', '', ''],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, sheet, 'Treatments');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

test.describe('register import', () => {
  test('admin can preview and confirm an XLSX import', async ({ loginAsAdmin }) => {
    const page = loginAsAdmin;
    await page.goto('/register');

    await page.getByRole('button', { name: /import|importer/i }).click();

    const fileChooserPromise = page.waitForEvent('filechooser');
    // Trigger the file input by clicking the visible label.
    await page.getByLabel(/choose file|choisir/i).click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles({
      name: 'import.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: buildXlsxBuffer(),
    });

    await page.getByRole('button', { name: /preview|aperçu/i }).click();
    await expect(page.getByText(/2 ready|2 prêts/i)).toBeVisible();

    await page.getByRole('button', { name: /confirm|confirmer/i }).click();
    await expect(page.getByText(/imported 2|2 traitement\(s\) importé\(s\)/i)).toBeVisible({
      timeout: 10_000,
    });

    // After import the table should now contain the new rows.
    await expect(page.getByText('e2e-import-1')).toBeVisible();
  });
});
