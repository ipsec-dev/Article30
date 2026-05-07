import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HashSeal } from '@/components/a30/hash-seal';

describe('<HashSeal />', () => {
  it('renders the provided short hash', () => {
    render(<HashSeal short="abcd…1234" />);
    expect(screen.getByText('abcd…1234')).toBeInTheDocument();
  });

  it('renders a different short hash when provided', () => {
    render(<HashSeal short="f3a2…b91c" />);
    expect(screen.getByText('f3a2…b91c')).toBeInTheDocument();
  });

  it('exposes an audit tooltip via title', () => {
    const { container } = render(<HashSeal short="aaaa…aaaa" />);
    expect(container.firstChild).toHaveAttribute('title', "Sceau d'audit (HMAC chaîné)");
  });
});
