import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n/context';
import { TreatmentImportDialog } from '@/components/treatment/treatment-import-dialog';

// Stub fetch — every test sets its own response.
function mockFetch(json: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => json,
  });
}

const renderDialog = (onClose = vi.fn(), onComplete = vi.fn()) =>
  render(
    <I18nProvider>
      <TreatmentImportDialog open onClose={onClose} onComplete={onComplete} />
    </I18nProvider>,
  );

beforeEach(() => {
  globalThis.fetch = mockFetch({}) as never;
});

describe('TreatmentImportDialog', () => {
  it('renders the upload step with a download-template link and file picker', () => {
    renderDialog();
    expect(screen.getByText(/import treatments from xlsx|importer/i)).toBeInTheDocument();
    expect(screen.getByText(/download template|télécharger/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/choose file|choisir/i)).toBeInTheDocument();
  });

  it('shows preview rows and disables Confirm when any row has errors', async () => {
    globalThis.fetch = mockFetch({
      rows: [
        { rowNumber: 2, name: 'a', status: 'ok', errors: [] },
        { rowNumber: 3, name: 'b', status: 'invalid', errors: ['missing_name'] },
      ],
      summary: { ok: 1, conflict: 0, invalid: 1, total: 2 },
    }) as never;

    renderDialog();
    const file = new File([new Uint8Array([0x50, 0x4b])], 'in.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await userEvent.upload(screen.getByLabelText(/choose file|choisir/i), file);
    await userEvent.click(screen.getByRole('button', { name: /preview|aperçu/i }));

    await waitFor(() =>
      expect(screen.getByText(/missing_name|nom est requis/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /confirm|confirmer/i })).toBeDisabled();
  });

  it('enables Confirm when every row is ok and calls the commit endpoint', async () => {
    const previewResponse = {
      rows: [{ rowNumber: 2, name: 'a', status: 'ok', errors: [] }],
      summary: { ok: 1, conflict: 0, invalid: 0, total: 1 },
    };
    const commitResponse = { created: 1 };
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        status: 201,
        ok: true,
        json: async () => (callCount === 1 ? previewResponse : commitResponse),
      });
    }) as never;

    const onComplete = vi.fn();
    renderDialog(vi.fn(), onComplete);

    const file = new File([new Uint8Array([0x50, 0x4b])], 'in.xlsx', { type: 'x' });
    await userEvent.upload(screen.getByLabelText(/choose file|choisir/i), file);
    await userEvent.click(screen.getByRole('button', { name: /preview|aperçu/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /confirm|confirmer/i })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: /confirm|confirmer/i }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(1));
  });

  it('surfaces a fresh preview when commit returns 409 with payload', async () => {
    const okPreview = {
      rows: [{ rowNumber: 2, name: 'race-loser', status: 'ok' as const, errors: [] }],
      summary: { ok: 1, conflict: 0, invalid: 0, total: 1 },
    };
    const conflictPreview = {
      rows: [
        {
          rowNumber: 2,
          name: 'race-loser',
          status: 'conflict' as const,
          errors: ['name_conflict_existing'],
        },
      ],
      summary: { ok: 0, conflict: 1, invalid: 0, total: 1 },
    };

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          status: 201,
          ok: true,
          json: async () => okPreview,
        });
      }
      // Second call (commit) returns 409 with a fresh preview payload.
      return Promise.resolve({
        status: 409,
        ok: false,
        json: async () => ({ message: 'import_preview_has_errors', preview: conflictPreview }),
      });
    }) as never;

    const onComplete = vi.fn();
    renderDialog(vi.fn(), onComplete);

    const file = new File([new Uint8Array([0x50, 0x4b])], 'in.xlsx', { type: 'x' });
    await userEvent.upload(screen.getByLabelText(/choose file|choisir/i), file);
    await userEvent.click(screen.getByRole('button', { name: /preview|aperçu/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /confirm|confirmer/i })).toBeEnabled(),
    );

    await userEvent.click(screen.getByRole('button', { name: /confirm|confirmer/i }));

    // The conflict error code from the second response should now appear inline.
    await waitFor(() =>
      expect(
        screen.getByText(/name_conflict_existing|traitement portant ce nom/i),
      ).toBeInTheDocument(),
    );
    // Confirm button is re-disabled because the new preview has a conflict.
    expect(screen.getByRole('button', { name: /confirm|confirmer/i })).toBeDisabled();
    // Commit was NOT considered successful.
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('surfaces a structural-failure code from the preview endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 400,
      ok: false,
      json: async () => ({ statusCode: 400, message: 'too_many_rows:600>500' }),
    }) as never;

    // sonner.toast is mocked separately if there's a global mock; otherwise this
    // test will display the toast in the JSDOM. Either way, the dialog should not
    // break and Confirm should remain disabled (no preview was set).
    renderDialog();
    const file = new File([new Uint8Array([0x50, 0x4b])], 'in.xlsx', { type: 'x' });
    await userEvent.upload(screen.getByLabelText(/choose file|choisir/i), file);
    await userEvent.click(screen.getByRole('button', { name: /preview|aperçu/i }));

    // Confirm stays disabled because no preview state was set (the 400 was handled).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /confirm|confirmer/i })).toBeDisabled(),
    );
  });

  it('falls back to a generic error key for unknown row error codes', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 201,
      ok: true,
      json: async () => ({
        rows: [
          { rowNumber: 2, name: 'x', status: 'invalid' as const, errors: ['unmapped_future_code'] },
        ],
        summary: { ok: 0, conflict: 0, invalid: 1, total: 1 },
      }),
    }) as never;

    renderDialog();
    const file = new File([new Uint8Array([0x50, 0x4b])], 'in.xlsx', { type: 'x' });
    await userEvent.upload(screen.getByLabelText(/choose file|choisir/i), file);
    await userEvent.click(screen.getByRole('button', { name: /preview|aperçu/i }));

    // The dialog must NOT render the raw `register.import.error.unmapped_future_code` string.
    await waitFor(() =>
      expect(
        screen.queryByText(/register\.import\.error\.unmapped_future_code/),
      ).not.toBeInTheDocument(),
    );
    // It MUST render the unknown-error i18n value (matches both EN and FR).
    expect(screen.getByText(/unrecognised|inconnue|recognized/i)).toBeInTheDocument();
  });
});
