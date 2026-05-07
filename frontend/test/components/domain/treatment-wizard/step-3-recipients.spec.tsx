import type { ComponentType } from 'react';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { FormProvider, useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import { Step3Recipients } from '@/components/domain/treatment-wizard/step-3-recipients';
import type { TreatmentWizardFormData } from '@/components/domain/treatment-wizard/types';
import { I18nProvider } from '@/i18n/context';
import { GuaranteeType } from '@article30/shared';

// Step3Recipients reads/writes via useFormContext<TreatmentWizardFormData>.
// Fields touched: recipients (RecipientEntry[]), transfers (TransferEntry[]).
// Recipient row: Radix Select (type) + Input (precision).
// Transfer row: Input destinationOrg, Input country (text — NOT a select),
//         Radix Select guaranteeType, Input documentLink.
// Adequacy indicator appears when transfer.country exactly matches a string in ADEQUATE_COUNTRIES
// (e.g. "Switzerland", "Canada"). A non-matching country (e.g. "United States") hides it.

// jsdom polyfills for Radix Select.
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

describe('Step3Recipients', () => {
  it('shows the empty-state messages when recipients and transfers are both empty', () => {
    renderStep<TreatmentWizardFormData>(Step3Recipients, {
      recipients: [],
      transfers: [],
    });

    expect(
      screen.getByText(/Aucun destinataire ajoute\. Cliquez sur "\+ Ajouter" pour commencer\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Aucun transfert hors UE declare/i)).toBeInTheDocument();
  });

  it('adds a recipient row and records type + precision in form state', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step3Recipients, {
      recipients: [],
      transfers: [],
    });

    await user.click(screen.getByRole('button', { name: /\+ Ajouter un destinataire/i }));
    expect(screen.getByText(/Destinataire 1/i)).toBeInTheDocument();
    expect(getFormValues().recipients).toEqual([{ type: '', precision: '' }]);

    // Open the recipient "Type" Select (the only combobox in the DOM at this point).
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(1);
    await user.click(comboboxes[0]);
    const subcontractorsOption = await screen.findByRole('option', { name: /Sous-traitants/i });
    await user.click(subcontractorsOption);

    expect(getFormValues().recipients[0]?.type).toBe('SUBCONTRACTORS');

    // Fill the precision field.
    const precisionInput = screen.getByPlaceholderText(/Nom ou description/i);
    await user.type(precisionInput, 'AWS Ireland');

    expect(getFormValues().recipients).toEqual([
      { type: 'SUBCONTRACTORS', precision: 'AWS Ireland' },
    ]);
  });

  it('removes a recipient row from form state when its delete button is clicked', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step3Recipients, {
      recipients: [
        { type: 'SUBCONTRACTORS', precision: 'First vendor' },
        { type: 'PARTNERS', precision: 'Second vendor' },
      ],
      transfers: [],
    });

    const firstCard = screen.getByText(/Destinataire 1/i).closest('div');
    expect(firstCard).not.toBeNull();

    // Each recipient card has one outline button — the delete button (svg trash icon).
    const deleteButton = within(firstCard as HTMLElement).getByRole('button');
    await user.click(deleteButton);

    expect(getFormValues().recipients).toEqual([{ type: 'PARTNERS', precision: 'Second vendor' }]);
    expect(screen.queryByDisplayValue('First vendor')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Second vendor')).toBeInTheDocument();
  });

  it('adds an empty transfer row with the default SCC guarantee', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step3Recipients, {
      recipients: [],
      transfers: [],
    });

    await user.click(screen.getByRole('button', { name: /\+ Ajouter un transfert/i }));

    expect(screen.getByText(/Transfert 1/i)).toBeInTheDocument();
    expect(getFormValues().transfers).toEqual([
      { destinationOrg: '', country: '', guaranteeType: GuaranteeType.SCC, documentLink: '' },
    ]);
  });

  it('fills every transfer field (destinationOrg, country, guaranteeType, documentLink) in form state', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step3Recipients, {
      recipients: [],
      transfers: [
        { destinationOrg: '', country: '', guaranteeType: GuaranteeType.SCC, documentLink: '' },
      ],
    });

    await user.type(screen.getByPlaceholderText(/Nom de l'organisation/i), 'AWS Inc.');
    await user.type(screen.getByPlaceholderText(/Ex: Etats-Unis/i), 'United States');

    // Guarantee-type Select is the only combobox; default is SCC (label "Clauses contractuelles types (CCT)").
    const guaranteeTrigger = screen.getByRole('combobox');
    await user.click(guaranteeTrigger);
    const bcrOption = await screen.findByRole('option', {
      name: /Règles d'entreprise contraignantes \(BCR\)/i,
    });
    await user.click(bcrOption);

    await user.type(screen.getByPlaceholderText(/https:\/\//i), 'https://example.com/doc.pdf');

    expect(getFormValues().transfers).toEqual([
      {
        destinationOrg: 'AWS Inc.',
        country: 'United States',
        guaranteeType: GuaranteeType.BCR,
        documentLink: 'https://example.com/doc.pdf',
      },
    ]);
  });

  it('shows the adequacy indicator when the country matches ADEQUATE_COUNTRIES (e.g. "Switzerland")', async () => {
    const user = setupUser();
    renderStep<TreatmentWizardFormData>(Step3Recipients, {
      recipients: [],
      transfers: [
        { destinationOrg: '', country: '', guaranteeType: GuaranteeType.SCC, documentLink: '' },
      ],
    });

    const countryInput = screen.getByPlaceholderText(/Ex: Etats-Unis/i);
    await user.type(countryInput, 'Switzerland');

    expect(screen.getByText(/Pays avec decision d'adequation/i)).toBeInTheDocument();
  });

  it('does NOT show the adequacy indicator when the country is outside ADEQUATE_COUNTRIES', async () => {
    const user = setupUser();
    renderStep<TreatmentWizardFormData>(Step3Recipients, {
      recipients: [],
      transfers: [
        { destinationOrg: '', country: '', guaranteeType: GuaranteeType.SCC, documentLink: '' },
      ],
    });

    const countryInput = screen.getByPlaceholderText(/Ex: Etats-Unis/i);
    await user.type(countryInput, 'United States');

    expect(screen.queryByText(/Pays avec decision d'adequation/i)).not.toBeInTheDocument();
  });

  it('removes a transfer row from form state when its delete button is clicked', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step3Recipients, {
      recipients: [],
      transfers: [
        {
          destinationOrg: 'Org A',
          country: 'Canada',
          guaranteeType: GuaranteeType.SCC,
          documentLink: '',
        },
        {
          destinationOrg: 'Org B',
          country: 'Brazil',
          guaranteeType: GuaranteeType.BCR,
          documentLink: '',
        },
      ],
    });

    expect(screen.getByDisplayValue('Org A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Org B')).toBeInTheDocument();

    const firstTransferCard = screen.getByText(/Transfert 1/i).closest('div');
    expect(firstTransferCard).not.toBeNull();

    // The first button inside the card header is the delete button.
    const deleteButton = within(firstTransferCard as HTMLElement).getAllByRole('button')[0];
    await user.click(deleteButton);

    expect(getFormValues().transfers).toEqual([
      {
        destinationOrg: 'Org B',
        country: 'Brazil',
        guaranteeType: GuaranteeType.BCR,
        documentLink: '',
      },
    ]);
    expect(screen.queryByDisplayValue('Org A')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Org B')).toBeInTheDocument();
  });
});
