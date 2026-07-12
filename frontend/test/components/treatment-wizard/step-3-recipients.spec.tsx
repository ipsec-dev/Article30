import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { I18nProvider } from '@/i18n/context';
import { Step3Recipients } from '@/components/domain/treatment-wizard/step-3-recipients';
import {
  DEFAULT_FORM_DATA,
  type TreatmentWizardFormData,
} from '@/components/domain/treatment-wizard/types';

function Harness() {
  const methods = useForm<TreatmentWizardFormData>({ defaultValues: DEFAULT_FORM_DATA });
  return (
    <FormProvider {...methods}>
      <Step3Recipients />
    </FormProvider>
  );
}

const renderStep = () =>
  render(
    <I18nProvider>
      <Harness />
    </I18nProvider>,
  );

// The Type field is a Radix combobox, so the only `textbox` roles in a recipient
// row are the free-text "precision" inputs — one per row.
const precisionInputs = () => screen.getAllByRole('textbox');

describe('<Step3Recipients> recipient rows', () => {
  beforeEach(() => {
    window.localStorage.setItem('article30-locale', 'en');
  });

  it('adds rows and keeps each row edit on its own row', async () => {
    const user = userEvent.setup();
    renderStep();

    expect(screen.getByText(/No recipients added/i)).toBeInTheDocument();

    const addRecipient = screen.getByRole('button', { name: '+ Add recipient' });
    await user.click(addRecipient);
    await user.click(addRecipient);

    const inputs = precisionInputs();
    expect(inputs).toHaveLength(2);

    // Edits go through field-path setValue; each row must keep its own value.
    await user.type(inputs[0], 'FIRST');
    await user.type(inputs[1], 'SECOND');
    expect(inputs[0]).toHaveValue('FIRST');
    expect(inputs[1]).toHaveValue('SECOND');
  });

  it('removes the targeted row and leaves the others intact', async () => {
    const user = userEvent.setup();
    renderStep();

    const addRecipient = screen.getByRole('button', { name: '+ Add recipient' });
    await user.click(addRecipient);
    await user.click(addRecipient);

    const inputs = precisionInputs();
    await user.type(inputs[0], 'FIRST');
    await user.type(inputs[1], 'SECOND');

    // The per-row remove buttons are the icon-only buttons (no add-label text).
    const removeButtons = screen
      .getAllByRole('button')
      .filter(b => b.textContent !== '+ Add recipient' && b.textContent !== '+ Add transfer');
    expect(removeButtons).toHaveLength(2);

    await user.click(removeButtons[0]);

    const remaining = precisionInputs();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveValue('SECOND');
  });
});
