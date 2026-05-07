import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { I18nProvider } from '@/i18n/context';
import { TreatmentWizard } from '@/components/domain/treatment-wizard';
import type { TreatmentWizardFormData } from '@/components/domain/treatment-wizard/types';

// TreatmentWizard orchestrates 6 steps with per-step validation and an auto/explicit
// draft-save. Validation field mapping (from index.tsx::validateStep):
// step 0 (Identification):  ['name']                               (name is required)
// step 1 (Data):            ['personCategories', 'dataCategories']
// step 2 (Recipients):      ['recipients']
// step 3 (Security):        ['retentionPeriod', 'securityMeasures']
// step 4 (Risk Assessment): none (all optional)
// step 5 (Review):          none
// Only step 0's `name` is registered with `required: true`; the other arrays are
// not registered with validation rules, so `trigger` on them resolves true by
// default even if empty. That means advancing past step 0 with just a name is
// sufficient for steps 1-4 in the current implementation.
//
// Save-as-Draft button always issues an api call:
// - with treatmentId:    api.patch(`/treatments/:id`, { ...payload, status: 'DRAFT' })
// - without treatmentId: api.post('/treatments',     { ...payload, status: 'DRAFT' })
// Final submit uses the same routing. ApiError from api.* already surfaces a
// toast via lib/api/client; the wizard also toasts for non-Api errors (e.g.
// network failures) so save/submit failures never happen silently. On any
// failure, onSuccess is not invoked and the wizard stays on the current step.

// Hoisted API mock so vi.mock below can capture it before module load.
const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: apiMock };
});

// jsdom polyfills for Radix (Select uses pointer capture + scrollIntoView + ResizeObserver).
beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!(globalThis as { ResizeObserver?: unknown }).ResizeObserver) {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

beforeEach(() => {
  apiMock.get.mockReset();
  apiMock.post.mockReset();
  apiMock.patch.mockReset();
  apiMock.put.mockReset();
  apiMock.delete.mockReset();
  vi.mocked(toast.error).mockReset();
});

function setupUser() {
  return userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
}

type WizardProps = {
  initialData?: Partial<TreatmentWizardFormData>;
  treatmentId?: string;
  onSuccess?: (treatment: unknown) => void;
  onCancel?: () => void;
};

function renderWizard(props: WizardProps = {}) {
  return render(
    <I18nProvider>
      <TreatmentWizard {...props} />
    </I18nProvider>,
  );
}

// Step content headings are rendered as <h2> with level 2. Both the step indicator
// button label (<span>) and the step body <h2> render the same i18n text, so we
// identify the currently-visible step by the heading role + level 2.
function expectStepVisible(label: RegExp) {
  expect(screen.getByRole('heading', { level: 2, name: label })).toBeInTheDocument();
}

describe('TreatmentWizard', () => {
  it('renders step 1 (Identification) on initial mount with the name field label', () => {
    renderWizard();

    expectStepVisible(/Identification/i);
    expect(screen.getByLabelText(/Nom du traitement/i)).toBeInTheDocument();
    // Previous button is hidden on step 0; Next button is present.
    expect(screen.queryByRole('button', { name: /^Précédent$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Suivant$/i })).toBeInTheDocument();
  });

  it('does not advance past step 1 when the required name field is empty', async () => {
    const user = setupUser();
    renderWizard();

    await user.click(screen.getByRole('button', { name: /^Suivant$/i }));

    // Still on step 1; the Data step heading is not present.
    expectStepVisible(/Identification/i);
    expect(screen.queryByRole('heading', { level: 2, name: /^Données$/i })).not.toBeInTheDocument();
    // The inline required-field error surfaces.
    expect(screen.getByText(/Ce champ est requis/i)).toBeInTheDocument();
  });

  it('advances to step 2 (Data) after filling the name and clicking Next', async () => {
    const user = setupUser();
    renderWizard();

    await user.type(screen.getByLabelText(/Nom du traitement/i), 'Gestion RH');
    await user.click(screen.getByRole('button', { name: /^Suivant$/i }));

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 2, name: /^Données$/i })).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('returns to the previous step when the Previous button is clicked', async () => {
    const user = setupUser();
    renderWizard();

    await user.type(screen.getByLabelText(/Nom du traitement/i), 'Gestion RH');
    await user.click(screen.getByRole('button', { name: /^Suivant$/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: /^Données$/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /^Précédent$/i }));

    expectStepVisible(/Identification/i);
  });

  it('jumps backward to an earlier step when its indicator button is clicked', async () => {
    const user = setupUser();
    renderWizard();

    // Advance to step 2.
    await user.type(screen.getByLabelText(/Nom du traitement/i), 'Gestion RH');
    await user.click(screen.getByRole('button', { name: /^Suivant$/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: /^Données$/i })).toBeInTheDocument(),
    );

    // The step 1 indicator button is accessible by its numbered label (checkmark
    // replaces the digit for completed steps, but the accessible name still
    // contains the step label "Identification").
    const indicatorButtons = screen
      .getAllByRole('button')
      .filter(btn => /Identification/i.test(btn.textContent || ''));
    expect(indicatorButtons.length).toBeGreaterThanOrEqual(1);
    await user.click(indicatorButtons[0]);

    expectStepVisible(/Identification/i);
  });

  it('prevents jumping forward past un-validated steps via the step indicator', async () => {
    const user = setupUser();
    renderWizard();

    // On step 0 with no name, the step-3 (Recipients) indicator must be disabled
    // (the wizard disables indicators where index > currentStep + 1, and forward
    // navigation is gated by validation anyway).
    const recipientsBtn = screen
      .getAllByRole('button')
      .find(btn => /Destinataires/i.test(btn.textContent || ''));
    expect(recipientsBtn).toBeDefined();
    expect(recipientsBtn).toBeDisabled();

    // Clicking it does nothing — step 0 remains visible.
    if (recipientsBtn) await user.click(recipientsBtn);
    expectStepVisible(/Identification/i);
  });

  it('Save-as-Draft without a treatmentId POSTs to /treatments with the filled payload', async () => {
    const user = setupUser();
    apiMock.post.mockResolvedValue({ id: 'new-1' });
    const onSuccess = vi.fn();
    renderWizard({ onSuccess });

    await user.type(screen.getByLabelText(/Nom du traitement/i), 'Gestion RH');
    await user.click(screen.getByRole('button', { name: /Enregistrer comme brouillon/i }));

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    const [path, body] = apiMock.post.mock.calls[0];
    expect(path).toBe('/treatments');
    expect(body).toMatchObject({ name: 'Gestion RH', status: 'DRAFT' });
    expect(onSuccess).toHaveBeenCalledWith({ id: 'new-1' });
  });

  it('Save-as-Draft with a treatmentId PATCHes /treatments/:id', async () => {
    const user = setupUser();
    apiMock.patch.mockResolvedValue({ id: 't-1' });
    const onSuccess = vi.fn();
    renderWizard({ treatmentId: 't-1', onSuccess });

    await user.type(screen.getByLabelText(/Nom du traitement/i), 'Gestion RH');
    await user.click(screen.getByRole('button', { name: /Enregistrer comme brouillon/i }));

    await waitFor(() => expect(apiMock.patch).toHaveBeenCalled());
    // With treatmentId, the explicit Save-Draft click and any auto-save triggered
    // on step change both PATCH the same URL; match the explicit call by the
    // full DRAFT-status payload with the typed name.
    const draftCall = apiMock.patch.mock.calls.find(
      ([path, body]) =>
        path === '/treatments/t-1' &&
        typeof body === 'object' &&
        body !== null &&
        (body as { status?: string }).status === 'DRAFT' &&
        (body as { name?: string }).name === 'Gestion RH',
    );
    expect(draftCall).toBeDefined();
    expect(onSuccess).toHaveBeenCalledWith({ id: 't-1' });
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it('final submit on the last step calls api.post and invokes onSuccess', async () => {
    const user = setupUser();
    apiMock.post.mockResolvedValue({ id: 'created-1' });
    const onSuccess = vi.fn();

    // Seed initialData so all prior steps validate (only step 0 has a hard
    // required field, but we populate defensively across all steps).
    renderWizard({
      initialData: {
        name: 'Treatment A',
        purpose: 'Suivi des candidats',
        legalBasis: 'CONSENT',
        personCategories: ['EMPLOYEES'],
        dataCategories: [{ category: 'CIVIL_STATUS', description: '', retentionPeriod: '' }],
        recipients: [{ type: 'INTERNAL_SERVICE', precision: '' }],
        transfers: [],
        retentionPeriod: '5 ans',
        securityMeasures: [{ type: 'ENCRYPTION', precision: '' }],
        hasSensitiveData: false,
      },
      onSuccess,
    });

    // Click Next five times to reach step 6 (index 5).
    for (let i = 0; i < 5; i += 1) {
      await user.click(screen.getByRole('button', { name: /^Suivant$/i }));
    }
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: /Récapitulatif/i })).toBeInTheDocument(),
    );

    // The final "Enregistrer" submit button replaces "Suivant".
    const submitBtn = screen.getByRole('button', { name: /^Enregistrer$/i });
    await user.click(submitBtn);

    await waitFor(() => expect(apiMock.post).toHaveBeenCalled());
    const [path, body] = apiMock.post.mock.calls[0];
    expect(path).toBe('/treatments');
    expect(body).toMatchObject({ name: 'Treatment A', status: 'DRAFT' });
    expect(onSuccess).toHaveBeenCalledWith({ id: 'created-1' });
  });

  it('toasts and stays on the current step when save-as-draft hits a non-Api error', async () => {
    const user = setupUser();
    apiMock.post.mockRejectedValue(new Error('network unreachable'));
    const onSuccess = vi.fn();
    renderWizard({ onSuccess });

    await user.type(screen.getByLabelText(/Nom du traitement/i), 'Gestion RH');
    await user.click(screen.getByRole('button', { name: /Enregistrer comme brouillon/i }));

    await waitFor(() => expect(apiMock.post).toHaveBeenCalled());
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('network unreachable');
    expectStepVisible(/Identification/i);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not double-toast when save-as-draft fails with an ApiError (lib/api/client already toasted)', async () => {
    const user = setupUser();
    apiMock.post.mockRejectedValue(new ApiError(400, 'Validation failed'));
    const onSuccess = vi.fn();
    renderWizard({ onSuccess });

    await user.type(screen.getByLabelText(/Nom du traitement/i), 'Gestion RH');
    await user.click(screen.getByRole('button', { name: /Enregistrer comme brouillon/i }));

    await waitFor(() => expect(apiMock.post).toHaveBeenCalled());
    expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
    expectStepVisible(/Identification/i);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('invokes onCancel when the Cancel button is clicked', async () => {
    const user = setupUser();
    const onCancel = vi.fn();
    renderWizard({ onCancel });

    await user.click(screen.getByRole('button', { name: /^Annuler$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
