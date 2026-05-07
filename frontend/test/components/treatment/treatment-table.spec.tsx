import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TreatmentStatus } from '@article30/shared';
import type { TreatmentDto } from '@article30/shared';
import { TreatmentTable } from '@/components/treatment/treatment-table';
import { I18nProvider } from '@/i18n/context';
import { makeTreatment } from '../../fixtures/treatment';

function renderWithI18n(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('<TreatmentTable />', () => {
  it('renders an empty state with a "Créer un traitement" link when no rows', () => {
    renderWithI18n(<TreatmentTable treatments={[]} />);
    expect(screen.getByText('Aucun traitement')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Créer un traitement/ })).toHaveAttribute(
      'href',
      '/register/new',
    );
  });

  it('renders a row per treatment with linked name', () => {
    renderWithI18n(
      <TreatmentTable
        treatments={[
          makeTreatment({ id: 'a', name: 'CRM' }),
          makeTreatment({ id: 'b', name: 'Paie' }),
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'CRM' })).toHaveAttribute('href', '/register/a');
    expect(screen.getByRole('link', { name: 'Paie' })).toHaveAttribute('href', '/register/b');
  });

  it('shows refNumber with # prefix and em-dash for null', () => {
    renderWithI18n(
      <TreatmentTable
        treatments={[
          makeTreatment({ id: 'a', refNumber: 12 }),
          makeTreatment({ id: 'b', refNumber: null }),
        ]}
      />,
    );
    expect(screen.getByText('#12')).toBeInTheDocument();
    // Multiple em-dashes may appear (refNumber + freshness fallback); at least one should exist
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('uses Validé and Brouillon labels for status', () => {
    renderWithI18n(
      <TreatmentTable
        treatments={[
          makeTreatment({ id: 'a', status: TreatmentStatus.VALIDATED }),
          makeTreatment({ id: 'b', status: TreatmentStatus.DRAFT }),
        ]}
      />,
    );
    expect(screen.getByText('Validé')).toBeInTheDocument();
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
  });

  it('renders freshness label "Obsolète" for OUTDATED indicator', () => {
    renderWithI18n(
      <TreatmentTable
        treatments={[
          makeTreatment({
            indicators: {
              completenessScore: 0,
              riskLevel: 'LOW',
              riskCriteriaCount: 0,
              freshnessStatus: 'OUTDATED',
              aipdRequired: false,
            } as unknown as TreatmentDto['indicators'],
          }),
        ]}
      />,
    );
    expect(screen.getByText('Obsolète')).toBeInTheDocument();
  });

  it('fires onRowClick when a row is clicked away from the link', async () => {
    const onRowClick = vi.fn();
    renderWithI18n(
      <TreatmentTable treatments={[makeTreatment({ id: 'a' })]} onRowClick={onRowClick} />,
    );
    await userEvent.click(screen.getByText('Brouillon', { exact: false }).closest('tr')!);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it('does NOT fire onRowClick when the name link is clicked (stopPropagation)', async () => {
    const onRowClick = vi.fn();
    renderWithI18n(
      <TreatmentTable
        treatments={[makeTreatment({ id: 'a', name: 'X' })]}
        onRowClick={onRowClick}
      />,
    );
    await userEvent.click(screen.getByRole('link', { name: 'X' }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
