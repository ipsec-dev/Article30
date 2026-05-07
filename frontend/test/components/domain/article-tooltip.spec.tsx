import type { ReactNode } from 'react';
import { describe, expect, it, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { ArticleTooltip, RiskCriterionTooltip } from '@/components/domain/article-tooltip';
import { I18nProvider } from '@/i18n/context';

// ArticleTooltip + RiskCriterionTooltip both:
// - use useI18n() for locale (default 'fr' in the provider)
// - look up content from a static map keyed by article code (e.g. '6', '9', '13'…) or
// criterion code (e.g. 'SENSITIVE_DATA', 'EVALUATION_SCORING'…)
// - fall back to `<>{children}</>` when the key is not in the map
// - when found, wrap children in a Radix Tooltip trigger (delayDuration=200) and render
// the French/English title + content inside a portalled TooltipContent
//
// The I18nProvider defaults to 'fr', so we assert against the French title strings.

// Radix Tooltip uses pointer events and ResizeObserver; jsdom needs a few polyfills and
// the pointer-events check in userEvent must be disabled to reliably open the tooltip.
beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver =
      ResizeObserverMock;
  }
  if (typeof globalThis.DOMRect === 'undefined') {
    (globalThis as unknown as { DOMRect: typeof DOMRect }).DOMRect = class {
      bottom = 0;
      left = 0;
      right = 0;
      top = 0;
      x = 0;
      y = 0;
      width = 0;
      height = 0;
      toJSON() {
        return this;
      }
    } as unknown as typeof DOMRect;
  }
});

function renderWithI18n(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

function setupUser() {
  return userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
}

describe('ArticleTooltip', () => {
  it('always renders the trigger children in the DOM', () => {
    renderWithI18n(<ArticleTooltip article="6">trigger text</ArticleTooltip>);
    expect(screen.getByText('trigger text')).toBeInTheDocument();
  });

  it('reveals French tooltip content when hovering over a known article code', async () => {
    const user = setupUser();
    renderWithI18n(<ArticleTooltip article="6">licéité</ArticleTooltip>);

    await user.hover(screen.getByText('licéité'));

    // French title from GDPR_ARTICLES['6'].titleFr.
    // Radix renders the title twice: once in the visible popper content, once in a
    // visually-hidden <span role="tooltip"> for screen readers. findAllByText covers both.
    const matches = await screen.findAllByText(
      /Article 6 - Licéité du traitement/i,
      {},
      { timeout: 2000 },
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to plain children for an unknown article code (no tooltip rendered)', () => {
    renderWithI18n(<ArticleTooltip article="Art. 999">unknown-art</ArticleTooltip>);

    // Children still rendered
    expect(screen.getByText('unknown-art')).toBeInTheDocument();
    // But no tooltip trigger wrapper and no known article title appears
    expect(screen.queryByText(/Article 6 - Licéité du traitement/i)).toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('styles the trigger wrapper with dashed underline + cursor-help tailwind classes', () => {
    renderWithI18n(<ArticleTooltip article="6">styled</ArticleTooltip>);

    const wrapper = screen.getByText('styled');
    expect(wrapper.className).toMatch(/cursor-help/);
    expect(wrapper.className).toMatch(/border-dashed/);
  });
});

describe('RiskCriterionTooltip', () => {
  it('reveals criterion title when hovering over a known criterion key', async () => {
    const user = setupUser();
    renderWithI18n(
      <RiskCriterionTooltip criterion="SENSITIVE_DATA">sensitive</RiskCriterionTooltip>,
    );

    await user.hover(screen.getByText('sensitive'));

    // French title from RISK_CRITERIA_ARTICLES['SENSITIVE_DATA'].titleFr.
    // findAllByText covers both the visible popper and the a11y-hidden <span role="tooltip">.
    const matches = await screen.findAllByText(
      /Critère 4 - Données sensibles/i,
      {},
      { timeout: 2000 },
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to plain children for an unknown criterion key', () => {
    renderWithI18n(<RiskCriterionTooltip criterion="unknown">plain</RiskCriterionTooltip>);

    expect(screen.getByText('plain')).toBeInTheDocument();
    expect(screen.queryByText(/Critère/i)).toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('styles the trigger wrapper with the cursor-help tailwind class', () => {
    renderWithI18n(
      <RiskCriterionTooltip criterion="EVALUATION_SCORING">eval</RiskCriterionTooltip>,
    );

    const wrapper = screen.getByText('eval');
    expect(wrapper.className).toMatch(/cursor-help/);
  });
});
