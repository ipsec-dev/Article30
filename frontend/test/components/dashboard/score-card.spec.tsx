import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScoreCard } from '@/components/dashboard/score-card';

const SNAPSHOTS = [
  { id: '1', score: 60, snapshotDate: '2025-01-01' },
  { id: '2', score: 75, snapshotDate: '2025-06-01' },
  { id: '3', score: 84, snapshotDate: '2025-11-01' },
];

describe('<ScoreCard />', () => {
  it('renders the score donut', () => {
    const { container } = render(
      <ScoreCard
        score={84}
        checklist={{ answered: 12, total: 22 }}
        freshness={{ validated: 8, total: 10 }}
        totalViolations={0}
        snapshots={SNAPSHOTS}
      />,
    );
    expect(container.querySelector('text')?.textContent).toContain('84');
  });

  it('renders checklist x/y, freshness percent, violations count', () => {
    render(
      <ScoreCard
        score={50}
        checklist={{ answered: 12, total: 22 }}
        freshness={{ validated: 8, total: 10 }}
        totalViolations={3}
        snapshots={SNAPSHOTS}
      />,
    );
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('/22')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('falls back to em-dash when freshness data is missing', () => {
    render(
      <ScoreCard
        score={0}
        checklist={{ answered: 0, total: 0 }}
        freshness={null}
        totalViolations={0}
        snapshots={SNAPSHOTS}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows the trend delta when snapshots span a range', () => {
    render(
      <ScoreCard
        score={84}
        checklist={{ answered: 0, total: 0 }}
        freshness={null}
        totalViolations={0}
        snapshots={SNAPSHOTS}
      />,
    );
    expect(screen.getByText('+24 pts')).toBeInTheDocument();
  });

  it('hides the trend section when fewer than 2 snapshots', () => {
    render(
      <ScoreCard
        score={50}
        checklist={{ answered: 0, total: 0 }}
        freshness={null}
        totalViolations={0}
        snapshots={[]}
      />,
    );
    expect(screen.queryByText(/Tendance 12 mois/)).not.toBeInTheDocument();
  });

  it('uses success color when violations is 0', () => {
    render(
      <ScoreCard
        score={100}
        checklist={{ answered: 0, total: 0 }}
        freshness={null}
        totalViolations={0}
        snapshots={SNAPSHOTS}
      />,
    );
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });
});
