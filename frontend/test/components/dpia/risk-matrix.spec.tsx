import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RiskMatrix } from '@/components/dpia/risk-matrix';

describe('<RiskMatrix />', () => {
  it('renders 9 cells (3 likelihoods × 3 severities)', () => {
    const { container } = render(<RiskMatrix />);
    expect(container.querySelectorAll('[role="gridcell"]')).toHaveLength(9);
  });

  it('renders the row + column header labels', () => {
    render(<RiskMatrix />);
    // Three Faible / Moyen / Élevé as severity column headers, plus three more as likelihood row headers,
    // plus inside cells. So just confirm each label appears at least once.
    expect(screen.getAllByText('Faible').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('Moyen').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('Élevé').length).toBeGreaterThanOrEqual(3);
  });

  it('marks the selected cell aria-selected', () => {
    const { container } = render(
      <RiskMatrix selectedLikelihood="medium" selectedSeverity="high" />,
    );
    const cell = container.querySelector('[data-likelihood="medium"][data-severity="high"]');
    expect(cell).toHaveAttribute('aria-selected', 'true');
  });

  it('non-selected cells have aria-selected=false', () => {
    const { container } = render(
      <RiskMatrix selectedLikelihood="medium" selectedSeverity="high" />,
    );
    const cell = container.querySelector('[data-likelihood="low"][data-severity="low"]');
    expect(cell).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the cell coordinates when clicked', async () => {
    const onChange = vi.fn();
    const { container } = render(<RiskMatrix onChange={onChange} />);
    const cell = container.querySelector<HTMLButtonElement>(
      '[data-likelihood="high"][data-severity="medium"]',
    );
    expect(cell).toBeTruthy();
    await userEvent.click(cell!);
    expect(onChange).toHaveBeenCalledWith('high', 'medium');
  });

  it('low+low is rendered with success bg', () => {
    const { container } = render(<RiskMatrix />);
    const cell = container.querySelector<HTMLButtonElement>(
      '[data-likelihood="low"][data-severity="low"]',
    );
    expect(cell?.style.background).toContain('var(--success-bg)');
  });

  it('high+high is rendered with danger bg', () => {
    const { container } = render(<RiskMatrix />);
    const cell = container.querySelector<HTMLButtonElement>(
      '[data-likelihood="high"][data-severity="high"]',
    );
    expect(cell?.style.background).toContain('var(--danger-bg)');
  });

  it('uses default ariaLabel "Matrice de risques"', () => {
    render(<RiskMatrix />);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-label', 'Matrice de risques');
  });
});
