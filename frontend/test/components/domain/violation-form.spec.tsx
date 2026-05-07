import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { ViolationForm, type ViolationFormData } from '@/components/domain/violation-form';
import { I18nProvider } from '@/i18n/context';
import { Severity } from '@article30/shared';

// Silence the user-list fetch that ViolationForm fires on mount.
vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn().mockResolvedValue([]) },
}));

// ViolationForm is a controlled form with local useState for each field.
// Props: { initialData?: Partial<ViolationFormData>, onSubmit, isLoading }.
// Submit button is disabled when `isLoading || !title.trim()`.
// Defaults: severity=Severity.LOW, discoveredAt=today (YYYY-MM-DD), booleans=false, strings=''.
// The submit handler transforms the state:
// - discoveredAt => new Date(str).toISOString()
// - dataCategoriesRaw => split ',' + trim + filter Boolean (omitted if empty array)
// - estimatedRecords (string) => Number.parseInt (omitted if empty)
// - riskLevel, assignedTo omitted if empty string
// - crossBorder, notifiedToCnil, notifiedToPersons always included (booleans)

// Radix Select requires a few browser APIs that jsdom does not implement.
// Polyfill them before any render so SelectPrimitive.Trigger / SelectPrimitive.Content do not throw.
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
});

function renderWithI18n(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

// Radix Select elements report `pointer-events: none` during transitions in jsdom,
// which causes userEvent.click to throw. Disabling the pointer-events check is the
// standard workaround (see Radix UI testing docs).
function setupUser() {
  return userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
}

function getTitleInput() {
  return screen.getByLabelText(/Titre|Title/i) as HTMLInputElement;
}
function getDescriptionInput() {
  return screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
}
function getDiscoveredAtInput() {
  return screen.getByLabelText(/Date de découverte|Discovered/i) as HTMLInputElement;
}
function getDataCategoriesInput() {
  return screen.getByLabelText(/Catégories de données affectées|Data categories/i, {
    selector: 'input',
  }) as HTMLInputElement;
}
function getEstimatedRecordsInput() {
  return screen.getByLabelText(
    /Nombre estimé de personnes affectées|Estimated records/i,
  ) as HTMLInputElement;
}
function getSubmitButton() {
  return screen.getByRole('button', { name: /Enregistrer|Save|Chargement|Loading/i });
}

describe('ViolationForm', () => {
  it('renders empty defaults when no initialData is provided', () => {
    const onSubmit = vi.fn();
    renderWithI18n(<ViolationForm onSubmit={onSubmit} isLoading={false} />);

    expect(getTitleInput().value).toBe('');
    expect(getDescriptionInput().value).toBe('');
    // Default discoveredAt is today in YYYY-MM-DD.
    const today = new Date().toISOString().slice(0, 10);
    expect(getDiscoveredAtInput().value).toBe(today);
    // Submit button is disabled because title is empty.
    expect(getSubmitButton()).toBeDisabled();
  });

  it('renders values from initialData', () => {
    const onSubmit = vi.fn();
    renderWithI18n(
      <ViolationForm
        isLoading={false}
        onSubmit={onSubmit}
        initialData={{
          title: 'Existing violation',
          description: 'Some description',
          severity: Severity.HIGH,
          discoveredAt: '2026-03-01T00:00:00.000Z',
          crossBorder: true,
          notifiedToCnil: true,
          notifiedToPersons: true,
          remediation: 'Patched the leak',
          dataCategories: ['Identity', 'Health'],
          estimatedRecords: 1234,
          riskLevel: 'HIGH',
          assignedTo: 'user-42',
        }}
      />,
    );

    expect(getTitleInput().value).toBe('Existing violation');
    expect(getDescriptionInput().value).toBe('Some description');
    expect(getDiscoveredAtInput().value).toBe('2026-03-01');
    expect(getDataCategoriesInput().value).toBe('Identity, Health');
    expect(getEstimatedRecordsInput().value).toBe('1234');

    // All three checkboxes should be checked.
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes).toHaveLength(3);
    for (const cb of checkboxes) {
      expect(cb.checked).toBe(true);
    }

    // Submit enabled because title is non-empty.
    expect(getSubmitButton()).toBeEnabled();
  });

  it('disables submit while isLoading=true and does not call onSubmit', async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderWithI18n(
      <ViolationForm isLoading onSubmit={onSubmit} initialData={{ title: 'Already-has-title' }} />,
    );

    const button = getSubmitButton();
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables submit when title is empty and does not call onSubmit', async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderWithI18n(<ViolationForm isLoading={false} onSubmit={onSubmit} />);

    const button = getSubmitButton();
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('enables submit once a title is typed and calls onSubmit on click', async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderWithI18n(<ViolationForm isLoading={false} onSubmit={onSubmit} />);

    await user.type(getTitleInput(), 'New violation');
    const button = getSubmitButton();
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: 'New violation' });
  });

  it('submits the currently-selected severity after changing it via the Radix Select', async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderWithI18n(
      <ViolationForm
        isLoading={false}
        onSubmit={onSubmit}
        initialData={{ title: 'Needs severity change' }}
      />,
    );

    // The severity Select is the first combobox on the form (the risk-level one is second).
    const comboboxes = screen.getAllByRole('combobox');
    const severityTrigger = comboboxes[0];
    await user.click(severityTrigger);

    // After opening, Radix renders options in a portal. Pick "Critique" (fr) / "Critical" (en).
    const criticalOption = await screen.findByRole('option', { name: /Critique|Critical/i });
    await user.click(criticalOption);

    await user.click(getSubmitButton());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ severity: Severity.CRITICAL });
  });

  it('propagates the notifiedToCnil checkbox in the submitted payload', async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderWithI18n(
      <ViolationForm
        isLoading={false}
        onSubmit={onSubmit}
        initialData={{ title: 'Check CNIL flag' }}
      />,
    );

    const cnilCheckbox = screen.getByRole('checkbox', {
      name: /Notifié à la CNIL|Notified to CNIL/i,
    });
    expect((cnilCheckbox as HTMLInputElement).checked).toBe(false);
    await user.click(cnilCheckbox);
    expect((cnilCheckbox as HTMLInputElement).checked).toBe(true);

    await user.click(getSubmitButton());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ notifiedToCnil: true });
  });

  it('propagates the notifiedToPersons checkbox in the submitted payload', async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderWithI18n(
      <ViolationForm
        isLoading={false}
        onSubmit={onSubmit}
        initialData={{ title: 'Check persons flag' }}
      />,
    );

    const personsCheckbox = screen.getByRole('checkbox', {
      name: /Personnes informées|Notified to persons/i,
    });
    await user.click(personsCheckbox);

    await user.click(getSubmitButton());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ notifiedToPersons: true });
  });

  it('propagates the crossBorder checkbox in the submitted payload', async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderWithI18n(
      <ViolationForm
        isLoading={false}
        onSubmit={onSubmit}
        initialData={{ title: 'Check cross-border flag' }}
      />,
    );

    const crossBorderCheckbox = screen.getByRole('checkbox', {
      name: /Incident transfrontalier|Cross.?border/i,
    });
    await user.click(crossBorderCheckbox);

    await user.click(getSubmitButton());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ crossBorder: true });
  });

  it('builds the submit payload with ISO date, parsed number, trimmed categories', async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderWithI18n(<ViolationForm isLoading={false} onSubmit={onSubmit} />);

    await user.type(getTitleInput(), 'Payload shape');
    await user.type(getDescriptionInput(), 'Test description');
    // Replace the default discoveredAt (today) with a fixed date.
    await user.clear(getDiscoveredAtInput());
    await user.type(getDiscoveredAtInput(), '2026-03-01');

    await user.type(getDataCategoriesInput(), 'Identity,  Health ,   ,Financial');
    await user.type(getEstimatedRecordsInput(), '42');

    await user.click(getSubmitButton());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as ViolationFormData;

    expect(payload.title).toBe('Payload shape');
    expect(payload.description).toBe('Test description');
    expect(payload.severity).toBe(Severity.LOW); // default
    // discoveredAt is an ISO string corresponding to 2026-03-01 (UTC midnight).
    expect(payload.discoveredAt).toBe(new Date('2026-03-01').toISOString());
    // Empty entries between commas must be filtered out.
    expect(payload.dataCategories).toEqual(['Identity', 'Health', 'Financial']);
    // estimatedRecords must be parsed to a number.
    expect(payload.estimatedRecords).toBe(42);
    expect(typeof payload.estimatedRecords).toBe('number');
    // Booleans default to false; checkboxes were not toggled.
    expect(payload.notifiedToCnil).toBe(false);
    expect(payload.notifiedToPersons).toBe(false);
    expect(payload.crossBorder).toBe(false);
  });

  it('omits optional string fields from the payload when they are left blank', async () => {
    const user = setupUser();
    const onSubmit = vi.fn();
    renderWithI18n(
      <ViolationForm
        isLoading={false}
        onSubmit={onSubmit}
        initialData={{ title: 'Minimal payload' }}
      />,
    );

    await user.click(getSubmitButton());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as ViolationFormData;

    // When left blank, the source uses conditional spreads to omit these keys entirely.
    expect(payload).not.toHaveProperty('dataCategories');
    expect(payload).not.toHaveProperty('estimatedRecords');
    expect(payload).not.toHaveProperty('riskLevel');
    expect(payload).not.toHaveProperty('assignedTo');
    // Unconditional fields are present even when empty strings / default booleans.
    expect(payload.description).toBe('');
    expect(payload.remediation).toBe('');
    expect(payload.crossBorder).toBe(false);
  });

  it('shows the "loading" label on the submit button while isLoading=true', () => {
    renderWithI18n(
      <ViolationForm isLoading onSubmit={vi.fn()} initialData={{ title: 'Loading label test' }} />,
    );

    // The button text should match the i18n common.loading key ("Chargement..." fr / "Loading..." en).
    const button = screen.getByRole('button');
    expect(button.textContent).toMatch(/Chargement|Loading/i);
    expect(button).toBeDisabled();
  });
});
