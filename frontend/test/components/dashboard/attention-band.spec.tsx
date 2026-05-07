import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AttentionBand } from '@/components/dashboard/attention-band';

const SAMPLE = [
  {
    type: 'DSR_OVERDUE',
    severity: 'CRITICAL' as const,
    title: 'DSR-2026-0038 dépassée',
    subtitle: '4 jours de retard',
  },
  {
    type: 'VENDOR_DPA_MISSING',
    severity: 'HIGH' as const,
    title: 'DPA manquant pour Acme',
    subtitle: '1 sous-traitant',
  },
  {
    type: 'CHECKLIST_GAP',
    severity: 'MEDIUM' as const,
    title: 'Article 32 non répondu',
    subtitle: '3 questions',
  },
  {
    type: 'STALE_TREATMENT',
    severity: 'LOW' as const,
    title: 'Traitement obsolète',
    subtitle: 'Revue requise',
  },
];

describe('<AttentionBand />', () => {
  it('renders nothing when there are no alerts', () => {
    const { container } = render(<AttentionBand alerts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders up to 3 rows even when more alerts are passed', () => {
    render(<AttentionBand alerts={SAMPLE} />);
    expect(screen.getAllByText(/Traiter/)).toHaveLength(3);
  });

  it('shows the singular header for a single alert', () => {
    render(<AttentionBand alerts={[SAMPLE[0]]} />);
    expect(screen.getByText(/1 point d'attention/)).toBeInTheDocument();
  });

  it('shows the plural header for multiple alerts', () => {
    render(<AttentionBand alerts={SAMPLE} />);
    expect(screen.getByText(/4 points d'attention/)).toBeInTheDocument();
  });

  it('uses the severity label inside the tag', () => {
    render(<AttentionBand alerts={[SAMPLE[0]]} />);
    expect(screen.getByText('Critique')).toBeInTheDocument();
  });

  it('falls back to alert.type when title is missing', () => {
    render(<AttentionBand alerts={[{ type: 'RAW_TYPE', severity: 'HIGH' }]} />);
    expect(screen.getByText('RAW_TYPE')).toBeInTheDocument();
  });

  it('the "Tout voir" link points to /alerts', () => {
    render(<AttentionBand alerts={SAMPLE} />);
    const link = screen.getByRole('link', { name: /Tout voir/ });
    expect(link).toHaveAttribute('href', '/alerts');
  });
});
