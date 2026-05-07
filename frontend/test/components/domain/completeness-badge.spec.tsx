import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompletenessBadge } from '@/components/domain/completeness-badge';
import { I18nProvider } from '@/i18n/context';

// CompletenessBadge takes:
// - score: number  (clamped 0..100, displayed as "NN%")
// - showLabel?: boolean
// It uses useI18n (for `badge.completeness.title`) and renders a progress bar + "<score>%".

function renderWithI18n(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('CompletenessBadge', () => {
  it('renders 0% for score=0', () => {
    renderWithI18n(<CompletenessBadge score={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders 50% for score=50 (mid-range)', () => {
    renderWithI18n(<CompletenessBadge score={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders 100% for score=100', () => {
    renderWithI18n(<CompletenessBadge score={100} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps scores above 100 and below 0', () => {
    const { unmount } = renderWithI18n(<CompletenessBadge score={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    unmount();
    renderWithI18n(<CompletenessBadge score={-25} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders the title label when showLabel is true (default)', () => {
    renderWithI18n(<CompletenessBadge score={42} />);
    // fr: "Complétude" / en: "Completeness"
    expect(screen.getByText(/Complétude|Completeness/i)).toBeInTheDocument();
  });

  it('omits the title label when showLabel is false', () => {
    renderWithI18n(<CompletenessBadge score={42} showLabel={false} />);
    expect(screen.queryByText(/Complétude|Completeness/i)).toBeNull();
  });
});
