import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusDot } from '@/components/a30/status-dot';

describe('<StatusDot />', () => {
  it('renders the label', () => {
    render(<StatusDot kind="success">Validé</StatusDot>);
    expect(screen.getByText('Validé')).toBeInTheDocument();
  });

  it('applies the success color via inline style on the dot', () => {
    const { container } = render(<StatusDot kind="success">x</StatusDot>);
    const dot = container.querySelector('span > span');
    expect(dot).toHaveStyle({ background: 'var(--success)' });
  });

  it('renders neutral by default', () => {
    const { container } = render(<StatusDot>x</StatusDot>);
    const dot = container.querySelector('span > span');
    expect(dot).toHaveStyle({ background: 'var(--ink-3)' });
  });

  it('renders danger color', () => {
    const { container } = render(<StatusDot kind="danger">x</StatusDot>);
    const dot = container.querySelector('span > span');
    expect(dot).toHaveStyle({ background: 'var(--danger)' });
  });

  it('uses tabular numeric font when mono', () => {
    const { container } = render(<StatusDot mono>1234</StatusDot>);
    expect(container.firstChild).toHaveClass('font-mono');
  });
});
