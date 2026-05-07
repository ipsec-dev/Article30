import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SLABar } from '@/components/dsr/sla-bar';

describe('<SLABar />', () => {
  it('shows N jours restants when within window', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-02-01T00:00:00Z');
    const now = new Date('2026-01-15T00:00:00Z');
    render(<SLABar startedAt={start} deadline={end} now={now} />);
    expect(screen.getByText(/jours restants/)).toBeInTheDocument();
  });

  it('shows "Dépassé de N jours" when past deadline', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-10T00:00:00Z');
    const now = new Date('2026-01-15T00:00:00Z');
    render(<SLABar startedAt={start} deadline={end} now={now} />);
    expect(screen.getByText(/Dépassé de/)).toBeInTheDocument();
  });

  it('caps fill width at 100% when overdue', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-10T00:00:00Z');
    const now = new Date('2026-02-01T00:00:00Z');
    const { container } = render(<SLABar startedAt={start} deadline={end} now={now} />);
    const fill = container.querySelector<HTMLElement>('[data-fill]');
    expect(fill?.style.width).toBe('100%');
  });

  it('uses success color when more than 50% time left', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-02-01T00:00:00Z');
    const now = new Date('2026-01-05T00:00:00Z'); // ~13% elapsed
    const { container } = render(<SLABar startedAt={start} deadline={end} now={now} />);
    const fill = container.querySelector<HTMLElement>('[data-fill]');
    expect(fill?.style.background).toContain('var(--success)');
  });

  it('uses warn color when 20-50% time left', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-02-01T00:00:00Z');
    const now = new Date('2026-01-21T00:00:00Z'); // ~64% elapsed → 36% remaining
    const { container } = render(<SLABar startedAt={start} deadline={end} now={now} />);
    const fill = container.querySelector<HTMLElement>('[data-fill]');
    expect(fill?.style.background).toContain('var(--warn)');
  });

  it('uses danger color when less than 20% time left', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-02-01T00:00:00Z');
    const now = new Date('2026-01-28T00:00:00Z'); // ~87% elapsed
    const { container } = render(<SLABar startedAt={start} deadline={end} now={now} />);
    const fill = container.querySelector<HTMLElement>('[data-fill]');
    expect(fill?.style.background).toContain('var(--danger)');
  });

  it('formats start and end dates as dd/MM', () => {
    const start = new Date('2026-01-05T00:00:00Z');
    const end = new Date('2026-02-15T00:00:00Z');
    render(<SLABar startedAt={start} deadline={end} now={new Date('2026-01-10T00:00:00Z')} />);
    expect(screen.getByText(/05\/01/)).toBeInTheDocument();
    expect(screen.getByText(/15\/02/)).toBeInTheDocument();
  });
});
