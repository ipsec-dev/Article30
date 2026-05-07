import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TweaksPanel } from '@/components/tweaks/tweaks-panel';

const DEFAULTS = { theme: 'ink' as const, dark: false, density: 'comfortable' as const };

describe('<TweaksPanel />', () => {
  it('renders the 4 theme options', () => {
    render(<TweaksPanel tweaks={DEFAULTS} onChange={() => {}} />);
    expect(screen.getByText('Indigo')).toBeInTheDocument();
    expect(screen.getByText('Forêt')).toBeInTheDocument();
    expect(screen.getByText('Sable')).toBeInTheDocument();
    expect(screen.getByText('Encre')).toBeInTheDocument();
  });

  it('renders the 2 density options', () => {
    render(<TweaksPanel tweaks={DEFAULTS} onChange={() => {}} />);
    expect(screen.getByText('Confortable')).toBeInTheDocument();
    expect(screen.getByText('Compacte')).toBeInTheDocument();
  });

  it('reflects the current theme as checked', () => {
    render(<TweaksPanel tweaks={{ ...DEFAULTS, theme: 'forest' }} onChange={() => {}} />);
    const radio = screen.getByDisplayValue('forest') as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });

  it('reflects the current density as checked', () => {
    render(<TweaksPanel tweaks={{ ...DEFAULTS, density: 'compact' }} onChange={() => {}} />);
    const radio = screen.getByDisplayValue('compact') as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });

  it('reflects dark mode toggle state', () => {
    const { container, rerender } = render(<TweaksPanel tweaks={DEFAULTS} onChange={() => {}} />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    rerender(<TweaksPanel tweaks={{ ...DEFAULTS, dark: true }} onChange={() => {}} />);
    expect(checkbox.checked).toBe(true);
  });

  it('calls onChange("theme", value) when a theme radio is clicked', async () => {
    const onChange = vi.fn();
    render(<TweaksPanel tweaks={DEFAULTS} onChange={onChange} />);
    await userEvent.click(screen.getByText('Forêt'));
    expect(onChange).toHaveBeenCalledWith('theme', 'forest');
  });

  it('calls onChange("density", value) when a density radio is clicked', async () => {
    const onChange = vi.fn();
    render(<TweaksPanel tweaks={DEFAULTS} onChange={onChange} />);
    await userEvent.click(screen.getByText('Compacte'));
    expect(onChange).toHaveBeenCalledWith('density', 'compact');
  });

  it('calls onChange("dark", true) when the dark toggle is clicked', async () => {
    const onChange = vi.fn();
    const { container } = render(<TweaksPanel tweaks={DEFAULTS} onChange={onChange} />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await userEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith('dark', true);
  });
});
