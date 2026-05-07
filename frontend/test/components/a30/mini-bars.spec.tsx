import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MiniBars } from '@/components/a30/mini-bars';

const SAMPLE = [
  { m: 'Jan', v: 10 },
  { m: 'Fev', v: 20 },
  { m: 'Mar', v: 5 },
  { m: 'Avr', v: 25 },
];

describe('<MiniBars />', () => {
  it('renders one bar per data point', () => {
    const { container } = render(<MiniBars data={SAMPLE} />);
    const bars = container.querySelectorAll('[data-bar]');
    expect(bars).toHaveLength(SAMPLE.length);
  });

  it('scales bars relative to the max value', () => {
    const { container } = render(<MiniBars data={SAMPLE} />);
    const bars = Array.from(container.querySelectorAll<HTMLElement>('[data-bar]'));
    expect(bars[3].style.height).toBe('100%');
    expect(bars[2].style.height).toBe('20%');
  });

  it('respects the height prop on the container', () => {
    const { container } = render(<MiniBars data={SAMPLE} height={80} />);
    const wrap = container.firstChild as HTMLElement;
    expect(wrap.style.height).toBe('80px');
  });
});
