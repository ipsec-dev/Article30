import type { ComponentType } from 'react';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { FormProvider, useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import { Step5Risk } from '@/components/domain/treatment-wizard/step-5-risk';
import type { TreatmentWizardFormData } from '@/components/domain/treatment-wizard/types';
import { I18nProvider } from '@/i18n/context';

// Step5Risk reads 9 boolean flags from the form context (hasEvaluationScoring,
// hasAutomatedDecisions, hasSystematicMonitoring, hasSensitiveData, isLargeScale,
// hasCrossDatasetLinking, involvesVulnerablePersons, usesInnovativeTech,
// canExcludeFromRights). Risk thresholds (from source):
// count 0 → LOW, count 1 → MEDIUM, count >= 2 → HIGH.
// AIPD warning is shown when count >= 2. SENSITIVE_DATA checkbox is auto-checked and
// disabled when hasSensitiveData is true (populated by step 2).

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

const ALL_FALSE: DefaultValues<TreatmentWizardFormData> = {
  hasEvaluationScoring: false,
  hasAutomatedDecisions: false,
  hasSystematicMonitoring: false,
  hasSensitiveData: false,
  isLargeScale: false,
  hasCrossDatasetLinking: false,
  involvesVulnerablePersons: false,
  usesInnovativeTech: false,
  canExcludeFromRights: false,
};

describe('Step5Risk', () => {
  it('renders all 9 risk criteria checkboxes', () => {
    renderStep<TreatmentWizardFormData>(Step5Risk, ALL_FALSE);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(9);
  });

  it('with 0 criteria selected, the risk badge shows LOW (fr: "Faible")', () => {
    renderStep<TreatmentWizardFormData>(Step5Risk, ALL_FALSE);

    // Count text and badge both visible.
    expect(screen.getByText(/0\/9 criteres selectionnes/i)).toBeInTheDocument();
    expect(screen.getByText(/^Faible$/i)).toBeInTheDocument();
  });

  it('with 1 criterion selected (seeded), badge shows MEDIUM (fr: "Moyen")', () => {
    renderStep<TreatmentWizardFormData>(Step5Risk, {
      ...ALL_FALSE,
      hasEvaluationScoring: true,
    });

    expect(screen.getByText(/1\/9 criteres selectionnes/i)).toBeInTheDocument();
    expect(screen.getByText(/^Moyen$/i)).toBeInTheDocument();
  });

  it('with 2 criteria selected (seeded), badge shows HIGH (fr: "Eleve")', () => {
    renderStep<TreatmentWizardFormData>(Step5Risk, {
      ...ALL_FALSE,
      hasEvaluationScoring: true,
      hasAutomatedDecisions: true,
    });

    expect(screen.getByText(/2\/9 criteres selectionnes/i)).toBeInTheDocument();
    // Only "Eleve" is rendered for the risk level (no accent in source code).
    expect(screen.getByText(/^Eleve$/i)).toBeInTheDocument();
  });

  it('AIPD warning is hidden with fewer than 2 criteria', () => {
    renderStep<TreatmentWizardFormData>(Step5Risk, {
      ...ALL_FALSE,
      hasEvaluationScoring: true,
    });

    // aipd.warning text is uniquely rendered by the warning block; absent here.
    expect(screen.queryByText(/Attention\s*:/i)).not.toBeInTheDocument();
  });

  it('AIPD warning is shown with 2 or more criteria', () => {
    renderStep<TreatmentWizardFormData>(Step5Risk, {
      ...ALL_FALSE,
      hasEvaluationScoring: true,
      hasAutomatedDecisions: true,
    });

    // The aipd.warning key is the distinct body text of the warning box.
    expect(screen.getByText(/Attention\s*:/i)).toBeInTheDocument();
    // "AIPD requise" appears both as warning heading and conclusion heading — assert it's present.
    const requiredHeadings = screen.getAllByText(/AIPD requise/i);
    expect(requiredHeadings.length).toBeGreaterThanOrEqual(1);
  });

  it('auto-checks AND disables the SENSITIVE_DATA checkbox when hasSensitiveData is true', () => {
    renderStep<TreatmentWizardFormData>(Step5Risk, {
      ...ALL_FALSE,
      hasSensitiveData: true,
    });

    // Locate the card via the fr label for SENSITIVE_DATA ("Données sensibles (Art. 9)").
    const labelEl = screen.getByText(/Données sensibles \(Art\. 9\)/i);
    // Walk up to the enclosing criterion card (which contains the checkbox).
    const card = labelEl.closest('.border') as HTMLElement | null;
    expect(card).toBeTruthy();
    const checkbox = within(card as HTMLElement).getByRole('checkbox');
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect((checkbox as HTMLInputElement).disabled).toBe(true);

    // The "Auto (étape 2)" badge is rendered next to the label.
    expect(screen.getByText(/Auto \(étape 2\)/i)).toBeInTheDocument();
  });

  it('clicking an unchecked criterion flips it in form state (MEDIUM risk)', async () => {
    const user = setupUser();
    const { getFormValues } = renderStep<TreatmentWizardFormData>(Step5Risk, ALL_FALSE);

    // Click the first criterion (EVALUATION_SCORING — fr label).
    const labelEl = screen.getByText(/Évaluation ou notation de personnes/i);
    const card = labelEl.closest('.border') as HTMLElement | null;
    expect(card).toBeTruthy();
    const checkbox = within(card as HTMLElement).getByRole('checkbox');

    await user.click(checkbox);

    expect(getFormValues().hasEvaluationScoring).toBe(true);
    // Badge now MEDIUM.
    expect(screen.getByText(/^Moyen$/i)).toBeInTheDocument();
  });
});
