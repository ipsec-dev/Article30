import type { ComponentType } from 'react';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { FormProvider, useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import { Step1Identity } from '@/components/domain/treatment-wizard/step-1-identity';
import type { TreatmentWizardFormData } from '@/components/domain/treatment-wizard/types';
import { I18nProvider } from '@/i18n/context';

// Step1Identity reads/writes via useFormContext<TreatmentWizardFormData>.
// Fields touched in this step: name (required), purpose, subPurposes (useFieldArray), legalBasis.
// MAX_SUB_PURPOSES is 5 (source const). The Add button is disabled at >=5 rows.
// Legal basis uses a Radix Select (portal-rendered options; requires jsdom polyfills).

// jsdom polyfills for Radix Select — same pattern as violation-form.spec.
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

describe('Step1Identity', () => {
  it('renders the name, purpose, legalBasis inputs and the empty-sub-purposes state', () => {
    renderStep<TreatmentWizardFormData>(Step1Identity, {
      name: '',
      purpose: '',
      subPurposes: [],
      legalBasis: '',
    });

    // Name + purpose labels (fr default locale).
    expect(screen.getByLabelText(/Nom du traitement/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Finalité/i)).toBeInTheDocument();
    // Sub-purposes empty state message.
    expect(screen.getByText(/Aucune sous-finalite ajoutee/i)).toBeInTheDocument();
    // Legal basis Select trigger.
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('updates form state when the user types into the name field', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step1Identity, {
      name: '',
      purpose: '',
      subPurposes: [],
      legalBasis: '',
    });

    const nameInput = screen.getByLabelText(/Nom du traitement/i);
    await user.type(nameInput, 'Gestion des candidatures');

    expect((nameInput as HTMLInputElement).value).toBe('Gestion des candidatures');
    expect(getFormValues().name).toBe('Gestion des candidatures');
  });

  it('updates form state when the user types into the purpose field', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step1Identity, {
      name: '',
      purpose: '',
      subPurposes: [],
      legalBasis: '',
    });

    const purposeInput = screen.getByLabelText(/Finalité/i);
    await user.type(purposeInput, 'Suivre les candidats');

    expect((purposeInput as HTMLTextAreaElement).value).toBe('Suivre les candidats');
    expect(getFormValues().purpose).toBe('Suivre les candidats');
  });

  it('appends a new sub-purpose row when the "+ Ajouter" button is clicked', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step1Identity, {
      name: '',
      purpose: '',
      subPurposes: [],
      legalBasis: '',
    });

    const addButton = screen.getByRole('button', { name: /\+ Ajouter/i });
    await user.click(addButton);

    // New row input is in the DOM with the locale-specific placeholder.
    const row = await screen.findByPlaceholderText('Sous-finalite 1');
    expect(row).toBeInTheDocument();

    expect(getFormValues().subPurposes).toEqual(['']);
  });

  it('disables the add button once MAX_SUB_PURPOSES (5) rows are present', () => {
    renderStep<TreatmentWizardFormData>(Step1Identity, {
      name: '',
      purpose: '',
      subPurposes: ['a', 'b', 'c', 'd', 'e'],
      legalBasis: '',
    });

    const addButton = screen.getByRole('button', { name: /\+ Ajouter/i });
    expect(addButton).toBeDisabled();

    // Counter label reflects the cap.
    expect(screen.getByText(/5\s*\/\s*5/)).toBeInTheDocument();
  });

  it('removes a sub-purpose from form state when its delete button is clicked', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step1Identity, {
      name: '',
      purpose: '',
      subPurposes: ['first', 'second'],
      legalBasis: '',
    });

    // Both rows rendered.
    expect(screen.getByDisplayValue('first')).toBeInTheDocument();
    expect(screen.getByDisplayValue('second')).toBeInTheDocument();

    // Every sub-purpose row has its own outline delete button; excluding the "+ Ajouter" one
    // leaves exactly as many delete buttons as rows.
    const buttons = screen
      .getAllByRole('button')
      .filter(btn => !/\+ Ajouter/i.test(btn.textContent || ''));
    expect(buttons).toHaveLength(2);

    // Click the first row's delete button.
    await user.click(buttons[0]);

    // "first" is gone; "second" remains.
    expect(screen.queryByDisplayValue('first')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('second')).toBeInTheDocument();
    expect(getFormValues().subPurposes).toEqual(['second']);
  });

  it('updates legalBasis in form state when an option is chosen via the Radix Select', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step1Identity, {
      name: '',
      purpose: '',
      subPurposes: [],
      legalBasis: '',
    });

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    // Radix portals the options; find by its accessible name (fr label: "Consentement").
    const option = await screen.findByRole('option', { name: /Consentement/i });
    await user.click(option);

    expect(getFormValues().legalBasis).toBe('CONSENT');
  });
});
