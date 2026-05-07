import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KpiGrid } from '@/components/dashboard/kpi-grid';

const SAMPLE = {
  treatments: { validated: 12, total: 18, draft: 4, needsReview: 2 },
  dsr: { open: 7, overdue: 1 },
  regulatoryNewCount: 3,
  vendorAlerts: 0,
};

describe('<KpiGrid />', () => {
  it('renders all 4 tiles as links', () => {
    render(<KpiGrid {...SAMPLE} />);
    expect(screen.getByRole('link', { name: /Traitements validés/ })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(screen.getByRole('link', { name: /Demandes ouvertes/ })).toHaveAttribute('href', '/dsr');
    expect(screen.getByRole('link', { name: /Veille à examiner/ })).toHaveAttribute(
      'href',
      '/regulatory-updates',
    );
    expect(screen.getByRole('link', { name: /Sous-traitants/ })).toHaveAttribute(
      'href',
      '/vendors',
    );
  });

  it('shows validated/total + sub-line context', () => {
    render(<KpiGrid {...SAMPLE} />);
    expect(screen.getByText('12 / 18')).toBeInTheDocument();
    expect(screen.getByText(/4 brouillons · 2 à revoir/)).toBeInTheDocument();
  });

  it('shows DSR open count and overdue sub', () => {
    render(<KpiGrid {...SAMPLE} />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText(/1 en retard/)).toBeInTheDocument();
  });

  it('shows "tous à jour" sub when no vendor alerts', () => {
    render(<KpiGrid {...SAMPLE} />);
    expect(screen.getByText('tous à jour')).toBeInTheDocument();
  });

  it('shows "alertes DPA" sub when vendor alerts > 0', () => {
    render(<KpiGrid {...{ ...SAMPLE, vendorAlerts: 2 }} />);
    expect(screen.getByText('alertes DPA')).toBeInTheDocument();
  });

  it('renders the regulatory new count', () => {
    render(<KpiGrid {...SAMPLE} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
