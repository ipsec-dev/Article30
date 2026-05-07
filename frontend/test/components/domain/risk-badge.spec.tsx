import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskLevel } from '@article30/shared';
import { RiskBadge } from '@/components/domain/risk-badge';
import { I18nProvider } from '@/i18n/context';

// RiskBadge takes:
// - riskLevel: RiskLevel (LOW | MEDIUM | HIGH)  -- no CRITICAL in the shared enum
// - criteriaCount: number
// - showTooltip?: boolean
// It uses useI18n: label resolves via `badge.riskLevel.<LEVEL>` and a "<count>/9" chip is
// always rendered alongside the label.

function renderWithI18n(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('RiskBadge', () => {
  it.each<{ level: RiskLevel; label: RegExp }>([
    // fr/en: "Faible" / "Low"
    { level: RiskLevel.LOW, label: /Faible|Low/i },
    // fr/en: "Moyen" / "Medium"
    { level: RiskLevel.MEDIUM, label: /Moyen|Medium/i },
    // fr/en: "Élevé" / "High"
    { level: RiskLevel.HIGH, label: /Élevé|Elevé|High/i },
  ])('renders the $level label', ({ level, label }) => {
    renderWithI18n(<RiskBadge riskLevel={level} criteriaCount={3} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders the criteriaCount as "N/9"', () => {
    renderWithI18n(<RiskBadge riskLevel={RiskLevel.MEDIUM} criteriaCount={5} />);
    expect(screen.getByText('5/9')).toBeInTheDocument();
  });

  it('exposes a tooltip (title attr) with the criteria count when showTooltip is true', () => {
    const { container } = renderWithI18n(
      <RiskBadge riskLevel={RiskLevel.HIGH} criteriaCount={7} showTooltip={true} />,
    );
    const badge = container.querySelector('[title]');
    expect(badge).not.toBeNull();
    // fr tooltip: "7/9 critères CNIL" — en: "7/9 CNIL criteria"
    expect(badge?.getAttribute('title')).toMatch(/7\/9/);
  });
});
