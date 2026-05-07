import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm, type DefaultValues } from 'react-hook-form';
import { GuaranteeType } from '@article30/shared';
import { Step6Review } from '@/components/domain/treatment-wizard/step-6-review';
import type { TreatmentWizardFormData } from '@/components/domain/treatment-wizard/types';
import { I18nProvider } from '@/i18n/context';

// Step6Review is read-only. It takes { treatmentId?: string } and uses useFormContext
// to read every form field. Key behaviours exercised here:
// - Completeness score from COMPLETENESS_WEIGHTS in @article30/shared (name=10, purpose=15,
// legalBasis=10, personCategories=10, dataCategories=10, recipients=10,
// retentionPeriod=10, securityMeasures=10, transfers=5, sensitiveCategories=5 (always
// awarded if !hasSensitiveData), riskCriteria=5 (always awarded)).
// - Risk level: count >=2 → HIGH, 1 → MEDIUM, 0 → LOW.
// - LEGAL_BASES.CONSENT.labelFr = "Consentement".
// - Edit note visible iff treatmentId is truthy.

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

function renderStep6(
  props: { treatmentId?: string },
  defaultValues: DefaultValues<TreatmentWizardFormData>,
) {
  function Harness() {
    const form = useForm<TreatmentWizardFormData>({ defaultValues });
    return (
      <I18nProvider>
        <FormProvider {...form}>
          <Step6Review {...props} />
        </FormProvider>
      </I18nProvider>
    );
  }
  return render(<Harness />);
}

const EMPTY_DEFAULTS: DefaultValues<TreatmentWizardFormData> = {
  name: '',
  purpose: '',
  subPurposes: [],
  legalBasis: '',
  personCategories: [],
  dataCategories: [],
  hasSensitiveData: false,
  sensitiveCategories: [],
  recipients: [],
  transfers: [],
  retentionPeriod: '',
  securityMeasures: [],
  hasEvaluationScoring: false,
  hasAutomatedDecisions: false,
  hasSystematicMonitoring: false,
  isLargeScale: false,
  hasCrossDatasetLinking: false,
  involvesVulnerablePersons: false,
  usesInnovativeTech: false,
  canExcludeFromRights: false,
};

describe('Step6Review', () => {
  it('renders the treatment name when provided in defaults', () => {
    renderStep6(
      {},
      {
        ...EMPTY_DEFAULTS,
        name: 'Gestion RH',
      },
    );

    expect(screen.getByText('Gestion RH')).toBeInTheDocument();
  });

  it('renders the localized legal-basis label for a known code (CONSENT → "Consentement")', () => {
    renderStep6(
      {},
      {
        ...EMPTY_DEFAULTS,
        name: 'Test',
        legalBasis: 'CONSENT',
      },
    );

    expect(screen.getByText(/Consentement/i)).toBeInTheDocument();
  });

  it('renders the CompletenessBadge with a non-zero percentage when fields are populated', () => {
    renderStep6(
      {},
      {
        ...EMPTY_DEFAULTS,
        name: 'Treatment',
        purpose: 'Gestion des candidats',
        legalBasis: 'CONSENT',
        personCategories: ['EMPLOYEES'],
        dataCategories: [{ category: 'CIVIL_STATUS', description: '', retentionPeriod: '' }],
        recipients: [{ type: 'INTERNAL_SERVICE', precision: '' }],
        retentionPeriod: '5 ans',
        securityMeasures: [{ type: 'ENCRYPTION', precision: '' }],
      },
    );

    // Completeness label (fr).
    expect(screen.getByText(/Complétude/i)).toBeInTheDocument();
    // Score: name(10)+purpose(15)+legalBasis(10)+personCategories(10)+dataCategories(10)
    // +recipients(10)+retentionPeriod(10)+securityMeasures(10)
    // +sensitiveCategories(5, because !hasSensitiveData)+riskCriteria(5) = 95
    expect(screen.getByText(/95%/)).toBeInTheDocument();
  });

  it('renders the RiskBadge as HIGH (fr: "Élevé") when >=2 risk criteria are seeded', () => {
    renderStep6(
      {},
      {
        ...EMPTY_DEFAULTS,
        name: 'Test',
        hasEvaluationScoring: true,
        hasAutomatedDecisions: true,
      },
    );

    // fr label for RiskLevel.HIGH is "Élevé" (from badge.riskLevel.HIGH key).
    // Also visible on the "Identified criteria" list inside the risk Section — so we
    // assert at least one match for the level label AND the 2/9 count badge.
    const elevated = screen.getAllByText(/Élevé/i);
    expect(elevated.length).toBeGreaterThanOrEqual(1);
    // Count badge renders "2/9".
    expect(screen.getAllByText('2/9').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the edit note when treatmentId is provided, and hides it otherwise', () => {
    const { unmount } = renderStep6(
      { treatmentId: 'abc-123' },
      { ...EMPTY_DEFAULTS, name: 'Test' },
    );
    expect(screen.getByText(/Vous modifiez un traitement existant/i)).toBeInTheDocument();
    unmount();

    renderStep6({}, { ...EMPTY_DEFAULTS, name: 'Test' });
    expect(screen.queryByText(/Vous modifiez un traitement existant/i)).not.toBeInTheDocument();
  });

  it('renders transfer rows with a safe "Voir document" link (target=_blank, rel=noopener noreferrer)', () => {
    renderStep6(
      {},
      {
        ...EMPTY_DEFAULTS,
        name: 'Test',
        transfers: [
          {
            destinationOrg: 'AWS',
            country: 'USA',
            guaranteeType: GuaranteeType.SCC,
            documentLink: 'https://example.com/transfer-doc',
          },
        ],
      },
    );

    const link = screen.getByRole('link', { name: /Voir document/i });
    expect(link).toHaveAttribute('href', 'https://example.com/transfer-doc');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
