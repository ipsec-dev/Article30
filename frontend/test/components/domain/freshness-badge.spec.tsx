import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FreshnessStatus } from '@article30/shared';
import { FreshnessBadge } from '@/components/domain/freshness-badge';
import { I18nProvider } from '@/i18n/context';

// FreshnessBadge takes:
// - freshnessStatus: FreshnessStatus (FRESH | PENDING_REVIEW | OUTDATED)
// - nextReviewAt?: string | null
// - showDays?: boolean
// It uses useI18n and resolves the label via `badge.freshness.<STATUS>`.
// Default locale is fr, so labels are: FRESH -> "À jour", PENDING_REVIEW -> "À revoir",
// OUTDATED -> "Obsolète". We assert on loose regexes that tolerate both FR + EN copy.

function renderWithI18n(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('FreshnessBadge', () => {
  it('renders the FRESH status label', () => {
    renderWithI18n(<FreshnessBadge freshnessStatus={FreshnessStatus.FRESH} showDays={false} />);
    // fr: "À jour", en: "Fresh"
    expect(screen.getByText(/À jour|Fresh/i)).toBeInTheDocument();
  });

  it('renders the PENDING_REVIEW status label', () => {
    renderWithI18n(
      <FreshnessBadge freshnessStatus={FreshnessStatus.PENDING_REVIEW} showDays={false} />,
    );
    // fr: "À revoir", en: "Pending Review"
    expect(screen.getByText(/À revoir|Pending Review/i)).toBeInTheDocument();
  });

  it('renders the OUTDATED status label', () => {
    renderWithI18n(<FreshnessBadge freshnessStatus={FreshnessStatus.OUTDATED} showDays={false} />);
    // fr: "Obsolète", en: "Outdated"
    expect(screen.getByText(/Obsolète|Outdated/i)).toBeInTheDocument();
  });

  it('renders a days-until-review chip when nextReviewAt is provided and showDays is true', () => {
    // nextReviewAt = now + ~10 days => the badge should include a "Nj" chip (days remaining)
    const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    renderWithI18n(
      <FreshnessBadge
        freshnessStatus={FreshnessStatus.FRESH}
        nextReviewAt={in10Days}
        showDays={true}
      />,
    );
    // The component renders `${days}j` as the chip text (e.g. "10j").
    expect(screen.getByText(/\d+j/)).toBeInTheDocument();
  });
});
