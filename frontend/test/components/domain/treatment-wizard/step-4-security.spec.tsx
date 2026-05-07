import type { ComponentType } from 'react';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { FormProvider, useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import { Step4Security } from '@/components/domain/treatment-wizard/step-4-security';
import type { TreatmentWizardFormData } from '@/components/domain/treatment-wizard/types';
import { I18nProvider } from '@/i18n/context';

// Step4Security reads/writes via useFormContext<TreatmentWizardFormData>.
// Fields touched in this step: retentionPeriod (string), securityMeasures (array of
// { type, precision }). Predefined measures come from SECURITY_MEASURES in @article30/shared;
// "custom" rows are entries whose type is not in the predefined list.
// Locale default is 'fr' (see I18nProvider).

// jsdom polyfills kept in sync with step-1 spec (Radix-friendly, though step 4 doesn't
// itself use a Select, other shared components may).
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

function setupUser() {
  return userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
}

function renderStep<T extends FieldValues>(
  Component: ComponentType,
  defaultValues: DefaultValues<T> = {} as DefaultValues<T>,
) {
  let formApi: ReturnType<typeof useForm<T>> | null = null;
  function Harness() {
    const form = useForm<T>({ defaultValues });
    formApi = form;
    return (
      <I18nProvider>
        <FormProvider {...form}>
          <Component />
        </FormProvider>
      </I18nProvider>
    );
  }
  const utils = render(<Harness />);
  return {
    ...utils,
    getFormValues: () => {
      if (!formApi) throw new Error('formApi not initialised');
      return formApi.getValues();
    },
  };
}

const BASE_DEFAULTS: DefaultValues<TreatmentWizardFormData> = {
  retentionPeriod: '',
  securityMeasures: [],
};

describe('Step4Security', () => {
  it('renders the retentionPeriod input; typing updates form state', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step4Security, BASE_DEFAULTS);

    const retentionInput = screen.getByLabelText(/Durée de conservation/i);
    expect(retentionInput).toBeInTheDocument();

    await user.type(retentionInput, '5 ans');
    expect((retentionInput as HTMLInputElement).value).toBe('5 ans');
    expect(getFormValues().retentionPeriod).toBe('5 ans');
  });

  it('checking a predefined security measure adds it to securityMeasures and reveals a precision textarea', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step4Security, BASE_DEFAULTS);

    // "Chiffrement des données" is the fr label of SECURITY_MEASURES.ENCRYPTION.
    const label = screen.getByText(/Chiffrement des données/i);
    const checkbox = label.parentElement?.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();

    await user.click(checkbox as HTMLInputElement);

    expect(getFormValues().securityMeasures).toEqual([{ type: 'ENCRYPTION', precision: '' }]);

    // Precision textarea now visible for that row.
    const precisionLabels = screen.getAllByText('Precision');
    expect(precisionLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('typing in the precision textarea updates the matching row in form state', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step4Security, {
      retentionPeriod: '',
      securityMeasures: [{ type: 'ENCRYPTION', precision: '' }],
    });

    const textarea = screen.getByPlaceholderText(/Decrivez les mesures specifiques/i);
    await user.type(textarea, 'AES-256');

    expect(getFormValues().securityMeasures).toEqual([
      { type: 'ENCRYPTION', precision: 'AES-256' },
    ]);
  });

  it('unchecking a measure removes the row from form state', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step4Security, {
      retentionPeriod: '',
      securityMeasures: [{ type: 'ENCRYPTION', precision: 'AES-256' }],
    });

    const label = screen.getByText(/Chiffrement des données/i);
    const checkbox = label.parentElement?.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    await user.click(checkbox as HTMLInputElement);

    expect(getFormValues().securityMeasures).toEqual([]);
  });

  it('"+ Ajouter une mesure personnalisee" appends a custom row with empty type + precision fields', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step4Security, BASE_DEFAULTS);

    const addBtn = screen.getByRole('button', { name: /\+ Ajouter une mesure personnalisee/i });
    await user.click(addBtn);

    expect(getFormValues().securityMeasures).toEqual([{ type: '', precision: '' }]);

    // Custom card heading is rendered as an exact-text span (distinct from the button
    // label which contains additional "+ Ajouter une " prefix).
    expect(screen.getByText(/^Mesure personnalisee$/)).toBeInTheDocument();
    // Type input placeholder present.
    expect(screen.getByPlaceholderText(/Ex: Audit de securite/i)).toBeInTheDocument();
  });

  it('typing into the custom measure precision + type fields updates state and keeps the row visible', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step4Security, {
      retentionPeriod: '',
      securityMeasures: [{ type: '', precision: '' }],
    });

    const precisionTextarea = screen.getByPlaceholderText(/Decrivez les mesures specifiques/i);
    await user.type(precisionTextarea, 'Annuel');
    expect(getFormValues().securityMeasures).toEqual([{ type: '', precision: 'Annuel' }]);

    const typeInput = screen.getByPlaceholderText(/Ex: Audit de securite/i);
    await user.type(typeInput, 'Penetration test');
    expect(getFormValues().securityMeasures).toEqual([
      { type: 'Penetration test', precision: 'Annuel' },
    ]);
    // Row stays visible after the type is non-empty (the predefined-list filter keeps it).
    expect(screen.getByDisplayValue('Penetration test')).toBeInTheDocument();
  });

  it('removing a custom measure (via its trash button) deletes its row from state', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step4Security, {
      retentionPeriod: '',
      securityMeasures: [{ type: '', precision: '' }],
    });

    // The CustomMeasureCard renders a heading span with exact text "Mesure personnalisee".
    const heading = screen.getByText(/^Mesure personnalisee$/);
    // The card root holds this span + a trash <button>.
    const card = heading.closest('div.border') as HTMLElement | null;
    expect(card).toBeTruthy();
    const removeBtn = (card as HTMLElement).querySelector('button');
    expect(removeBtn).toBeTruthy();

    await user.click(removeBtn as HTMLButtonElement);

    expect(getFormValues().securityMeasures).toEqual([]);
    expect(screen.queryByText(/^Mesure personnalisee$/)).not.toBeInTheDocument();
  });

  it('summary box displays the count of selected measures', () => {
    renderStep<TreatmentWizardFormData>(Step4Security, {
      retentionPeriod: '3 ans',
      securityMeasures: [
        { type: 'ENCRYPTION', precision: '' },
        { type: 'BACKUP', precision: '' },
      ],
    });

    // Summary heading.
    expect(screen.getByText(/Resume/i)).toBeInTheDocument();
    // Count rendered inside the summary list.
    expect(screen.getByText(/2 selectionnee\(s\)/i)).toBeInTheDocument();
    // Retention reflected too.
    expect(screen.getByText('3 ans')).toBeInTheDocument();
  });
});
