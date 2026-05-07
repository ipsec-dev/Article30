import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeadlinePill } from '@/components/dsr/deadline-pill';

const FIXED_NOW = new Date('2026-04-30T00:00:00Z');

describe('<DeadlinePill />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders Closed pill regardless of deadline when status is CLOSED', () => {
    render(<DeadlinePill deadline="2026-01-01T00:00:00Z" status="CLOSED" pauses={[]} />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('shows overdue label in red when deadline is in the past and status is open', () => {
    render(<DeadlinePill deadline="2026-04-25T00:00:00Z" status="IN_PROGRESS" pauses={[]} />);
    expect(screen.getByText(/5 days overdue/)).toBeInTheDocument();
  });

  it('shows amber pill within 7 days', () => {
    render(<DeadlinePill deadline="2026-05-05T00:00:00Z" status="IN_PROGRESS" pauses={[]} />);
    const pill = screen.getByText(/5 days remaining/);
    expect(pill.className).toContain('amber');
  });

  it('shows green pill beyond 7 days', () => {
    render(<DeadlinePill deadline="2026-06-30T00:00:00Z" status="IN_PROGRESS" pauses={[]} />);
    const pill = screen.getByText(/61 days remaining/);
    expect(pill.className).toContain('green');
  });

  it('appends a "Paused" chip when at least one pause is open', () => {
    render(
      <DeadlinePill
        deadline="2026-06-01T00:00:00Z"
        status="AWAITING_REQUESTER"
        pauses={[
          { id: 'p1', resumedAt: '2026-04-20T00:00:00Z' } as never,
          { id: 'p2', resumedAt: null } as never,
        ]}
      />,
    );
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('does not render a Paused chip when every pause has resumed', () => {
    render(
      <DeadlinePill
        deadline="2026-06-01T00:00:00Z"
        status="IN_PROGRESS"
        pauses={[{ id: 'p1', resumedAt: '2026-04-20T00:00:00Z' } as never]}
      />,
    );
    expect(screen.queryByText('Paused')).not.toBeInTheDocument();
  });
});
