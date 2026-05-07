import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvatarInitials } from '@/components/a30/avatar-initials';

describe('<AvatarInitials />', () => {
  it('shows up to 2 uppercase initials from a multi-word name', () => {
    render(<AvatarInitials name="Camille Dupont" />);
    expect(screen.getByText('CD')).toBeInTheDocument();
  });

  it('keeps only the first two words when there are more', () => {
    render(<AvatarInitials name="Marie Anne Sophie" />);
    expect(screen.getByText('MA')).toBeInTheDocument();
  });

  it('falls back gracefully on a single-word name', () => {
    render(<AvatarInitials name="Sara" />);
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('renders an empty string for an empty name (no crash)', () => {
    const { container } = render(<AvatarInitials name="" />);
    expect(container.firstChild?.textContent).toBe('');
  });

  it('handles whitespace-only names without crashing', () => {
    const { container } = render(<AvatarInitials name="   " />);
    expect(container.firstChild?.textContent).toBe('');
  });

  it('handles undefined name without crashing', () => {
    const { container } = render(<AvatarInitials name={undefined} />);
    expect(container.firstChild?.textContent).toBe('');
  });

  it('handles null name without crashing', () => {
    const { container } = render(<AvatarInitials name={null} />);
    expect(container.firstChild?.textContent).toBe('');
  });

  it('applies the size prop to width/height', () => {
    const { container } = render(<AvatarInitials name="A B" size={40} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('40px');
    expect(el.style.height).toBe('40px');
  });
});
