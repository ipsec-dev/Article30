import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChecklistScore } from '@/components/checklist/checklist-score';

const SECTIONS = [
  { key: 's1', label: 'Bases légales', answered: 5, total: 5 },
  { key: 's2', label: 'Sécurité', answered: 3, total: 7 },
  { key: 's3', label: 'Droits des personnes', answered: 0, total: 4 },
];

describe('<ChecklistScore />', () => {
  it('renders the score donut', () => {
    const { container } = render(
      <ChecklistScore score={84} answered={12} total={22} sections={SECTIONS} />,
    );
    expect(container.querySelector('text')?.textContent).toContain('84');
  });

  it('shows "X / Y" answered count', () => {
    render(<ChecklistScore score={50} answered={8} total={16} sections={[]} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('/ 16')).toBeInTheDocument();
  });

  it('renders one row per section', () => {
    render(<ChecklistScore score={50} answered={8} total={16} sections={SECTIONS} />);
    expect(screen.getByText('Bases légales')).toBeInTheDocument();
    expect(screen.getByText('Sécurité')).toBeInTheDocument();
    expect(screen.getByText('Droits des personnes')).toBeInTheDocument();
  });

  it('shows answered/total for each section', () => {
    render(<ChecklistScore score={0} answered={0} total={0} sections={SECTIONS} />);
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
    expect(screen.getByText('3 / 7')).toBeInTheDocument();
    expect(screen.getByText('0 / 4')).toBeInTheDocument();
  });

  it('omits the section list when sections is empty', () => {
    const { container } = render(<ChecklistScore score={0} answered={0} total={0} sections={[]} />);
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  it('uses success color for >= 80% sections', () => {
    const { container } = render(
      <ChecklistScore score={100} answered={5} total={5} sections={[SECTIONS[0]]} />,
    );
    const fill = container.querySelector<HTMLElement>('[data-fill]');
    expect(fill?.style.background).toContain('var(--success)');
  });

  it('uses danger color for < 50% sections', () => {
    const { container } = render(
      <ChecklistScore
        score={0}
        answered={0}
        total={4}
        sections={[{ key: 's3', label: 'X', answered: 0, total: 4 }]}
      />,
    );
    const fill = container.querySelector<HTMLElement>('[data-fill]');
    expect(fill?.style.background).toContain('var(--danger)');
  });
});
