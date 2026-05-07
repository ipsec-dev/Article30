import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DpaTooltip } from '@/components/domain/dpa-tooltip';
import { I18nProvider } from '@/i18n/context';

describe('<DpaTooltip />', () => {
  it('renders a help button with the localised aria-label', () => {
    render(
      <I18nProvider>
        <DpaTooltip />
      </I18nProvider>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label');
    expect(btn.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(0);
  });

  it('toggles the icon colour on hover via the inline style', () => {
    render(
      <I18nProvider>
        <DpaTooltip />
      </I18nProvider>,
    );
    const btn = screen.getByRole('button');
    fireEvent.mouseEnter(btn);
    expect(btn.style.color).toBe('var(--ink)');
    fireEvent.mouseLeave(btn);
    expect(btn.style.color).toBe('var(--ink-3)');
  });
});
