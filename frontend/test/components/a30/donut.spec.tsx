import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Donut } from '@/components/a30/donut';

describe('<Donut />', () => {
  it('renders the value as text inside the SVG', () => {
    const { container } = render(<Donut value={84} />);
    expect(container.querySelector('text')?.textContent).toContain('84');
  });

  it('produces a valid stroke-dasharray on the progress arc', () => {
    const { container } = render(<Donut value={50} size={100} stroke={8} />);
    const arcs = container.querySelectorAll('circle');
    expect(arcs).toHaveLength(2);
    const dasharray = arcs[1].getAttribute('stroke-dasharray');
    expect(dasharray).toMatch(/^[\d.]+ [\d.]+$/);
  });

  it('respects custom size prop on the svg element', () => {
    const { container } = render(<Donut value={10} size={120} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '120');
  });

  it('clamps values above 100 and below 0', () => {
    const { container } = render(<Donut value={250} />);
    expect(container.querySelector('text')?.textContent).toContain('100');
    const { container: c2 } = render(<Donut value={-30} />);
    expect(c2.querySelector('text')?.textContent).toContain('0');
  });
});
