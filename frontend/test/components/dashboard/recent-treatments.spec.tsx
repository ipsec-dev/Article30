import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TreatmentStatus, FreshnessStatus, RiskLevel } from '@article30/shared';
import { RecentTreatments } from '@/components/dashboard/recent-treatments';
import { makeTreatment } from '../../fixtures/treatment';

describe('<RecentTreatments />', () => {
  it('renders the empty state with a "Créer un traitement" link when no treatments', () => {
    render(<RecentTreatments treatments={[]} />);
    expect(screen.getByText('Aucun traitement')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Créer un traitement/ })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('caps the rows at 5', () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      makeTreatment({ id: `t-${i}`, refNumber: i + 1, name: `Treatment ${i}` }),
    );
    render(<RecentTreatments treatments={items} />);
    expect(screen.getAllByRole('link', { name: /^Treatment / })).toHaveLength(5);
  });

  it('renders status with correct label', () => {
    render(
      <RecentTreatments treatments={[makeTreatment({ status: TreatmentStatus.VALIDATED })]} />,
    );
    expect(screen.getByText('Validé')).toBeInTheDocument();
  });

  it('renders draft status', () => {
    render(<RecentTreatments treatments={[makeTreatment({ status: TreatmentStatus.DRAFT })]} />);
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
  });

  it('renders freshness label "Obsolète" for OUTDATED', () => {
    render(
      <RecentTreatments
        treatments={[
          makeTreatment({
            indicators: {
              completenessScore: 0,
              riskLevel: RiskLevel.LOW,
              riskCriteriaCount: 0,
              freshnessStatus: FreshnessStatus.OUTDATED,
              aipdRequired: false,
            },
          }),
        ]}
      />,
    );
    expect(screen.getByText('Obsolète')).toBeInTheDocument();
  });

  it('renders the treatment name as a link to its detail page', () => {
    render(<RecentTreatments treatments={[makeTreatment({ id: 'abc-123', name: 'CRM' })]} />);
    expect(screen.getByRole('link', { name: 'CRM' })).toHaveAttribute('href', '/register/abc-123');
  });

  it('shows the ref number with # prefix when present', () => {
    render(<RecentTreatments treatments={[makeTreatment({ refNumber: 42 })]} />);
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('shows em-dash when refNumber is null', () => {
    render(<RecentTreatments treatments={[makeTreatment({ refNumber: null })]} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });
});
