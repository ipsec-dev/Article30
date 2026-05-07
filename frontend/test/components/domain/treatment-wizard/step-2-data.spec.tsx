import type { ComponentType } from 'react';
import { describe, expect, it, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import { Step2Data } from '@/components/domain/treatment-wizard/step-2-data';
import type { TreatmentWizardFormData } from '@/components/domain/treatment-wizard/types';
import { I18nProvider } from '@/i18n/context';

// Step2Data reads/writes via useFormContext<TreatmentWizardFormData>.
// Fields touched: personCategories (string[]), dataCategories (DataCategoryEntry[]),
// hasSensitiveData (boolean), sensitiveCategories (string[]).
// No Radix Select on this step; only native <input type="checkbox">, <textarea>, <input>.
// Polyfills kept in case an internal component adds them later.
beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
  if (!(globalThis as { ResizeObserver?: unknown }).ResizeObserver) {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

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

describe('Step2Data', () => {
  it('renders the known person-category checkboxes (fr labels)', () => {
    renderStep<TreatmentWizardFormData>(Step2Data, {
      personCategories: [],
      dataCategories: [],
      hasSensitiveData: false,
      sensitiveCategories: [],
    });

    // Known codes from @article30/shared PERSON_CATEGORIES (fr labels).
    expect(screen.getByRole('checkbox', { name: /Employés/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Clients/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Fournisseurs/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Candidats/i })).toBeInTheDocument();
  });

  it('toggles a single person-category into form state when its checkbox is clicked', async () => {
    const user = userEvent.setup();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step2Data, {
      personCategories: [],
      dataCategories: [],
      hasSensitiveData: false,
      sensitiveCategories: [],
    });

    const employeesCheckbox = screen.getByRole('checkbox', { name: /Employés/i });
    await user.click(employeesCheckbox);

    expect((employeesCheckbox as HTMLInputElement).checked).toBe(true);
    expect(getFormValues().personCategories).toEqual(['EMPLOYEES']);
  });

  it('accumulates multiple person-category selections in form state', async () => {
    const user = userEvent.setup();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step2Data, {
      personCategories: [],
      dataCategories: [],
      hasSensitiveData: false,
      sensitiveCategories: [],
    });

    await user.click(screen.getByRole('checkbox', { name: /Employés/i }));
    await user.click(screen.getByRole('checkbox', { name: /Clients/i }));
    await user.click(screen.getByRole('checkbox', { name: /Candidats/i }));

    expect(getFormValues().personCategories).toEqual(['EMPLOYEES', 'CLIENTS', 'CANDIDATES']);
  });

  it('renders a row for every data-category', () => {
    renderStep<TreatmentWizardFormData>(Step2Data, {
      personCategories: [],
      dataCategories: [],
      hasSensitiveData: false,
      sensitiveCategories: [],
    });

    // Known codes from @article30/shared DATA_CATEGORIES (fr labels).
    expect(screen.getByRole('checkbox', { name: /État civil, identité/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Vie professionnelle/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Données de connexion/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Données de localisation/i })).toBeInTheDocument();
  });

  it('reveals the description + retention fields only after a data-category is selected', async () => {
    const user = userEvent.setup();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step2Data, {
      personCategories: [],
      dataCategories: [],
      hasSensitiveData: false,
      sensitiveCategories: [],
    });

    // Before selection: no description / retention textboxes.
    expect(screen.queryByPlaceholderText(/Precisez les donnees collectees/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/Ex: 5 ans/i)).toBeNull();

    await user.click(screen.getByRole('checkbox', { name: /État civil, identité/i }));

    // After selection: the description + retention fields appear.
    expect(screen.getByPlaceholderText(/Precisez les donnees collectees/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: 5 ans/i)).toBeInTheDocument();

    expect(getFormValues().dataCategories).toEqual([
      { category: 'CIVIL_STATUS', description: '', retentionPeriod: '' },
    ]);
  });

  it('updates the description for a selected data-category in form state', async () => {
    const user = userEvent.setup();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step2Data, {
      personCategories: [],
      dataCategories: [{ category: 'CIVIL_STATUS', description: '', retentionPeriod: '' }],
      hasSensitiveData: false,
      sensitiveCategories: [],
    });

    const descriptionField = screen.getByPlaceholderText(/Precisez les donnees collectees/i);
    await user.type(descriptionField, 'Nom, prenom, date de naissance');

    expect(getFormValues().dataCategories).toEqual([
      {
        category: 'CIVIL_STATUS',
        description: 'Nom, prenom, date de naissance',
        retentionPeriod: '',
      },
    ]);
  });

  it('hides the sensitive-categories grid when hasSensitiveData is false', () => {
    renderStep<TreatmentWizardFormData>(Step2Data, {
      personCategories: [],
      dataCategories: [],
      hasSensitiveData: false,
      sensitiveCategories: [],
    });

    // The sensitive-data master toggle is present.
    expect(
      screen.getByRole('checkbox', { name: /Ce traitement concerne des donnees sensibles/i }),
    ).toBeInTheDocument();

    // But the sensitive-category checkboxes are not.
    expect(screen.queryByRole('checkbox', { name: /Données génétiques/i })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /Données biométriques/i })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /Données de santé/i })).toBeNull();
  });

  it('reveals the sensitive-categories grid when toggled on and records selections in form state', async () => {
    const user = userEvent.setup();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step2Data, {
      personCategories: [],
      dataCategories: [],
      hasSensitiveData: false,
      sensitiveCategories: [],
    });

    // Turn sensitive-data on.
    await user.click(
      screen.getByRole('checkbox', { name: /Ce traitement concerne des donnees sensibles/i }),
    );
    expect(getFormValues().hasSensitiveData).toBe(true);

    // Grid renders — check a couple of fr-labelled sensitive categories.
    const healthCheckbox = screen.getByRole('checkbox', { name: /Données de santé/i });
    const biometricCheckbox = screen.getByRole('checkbox', { name: /Données biométriques/i });
    expect(healthCheckbox).toBeInTheDocument();
    expect(biometricCheckbox).toBeInTheDocument();

    await user.click(healthCheckbox);
    await user.click(biometricCheckbox);

    expect(getFormValues().sensitiveCategories).toEqual(['HEALTH', 'BIOMETRIC']);
  });
});
