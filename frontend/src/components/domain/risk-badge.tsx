'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/context';
import { RiskLevel } from '@article30/shared';

interface RiskBadgeProps {
  riskLevel: RiskLevel;
  criteriaCount: number;
  className?: string;
  showTooltip?: boolean;
}

/**
 * Risk badge showing risk level and criteria count.
 * Colors: green (LOW), orange (MEDIUM), red (HIGH)
 * Tooltip: "X/9 critères CNIL"
 */
export function RiskBadge({
  riskLevel,
  criteriaCount,
  className,
  showTooltip = true,
}: Readonly<RiskBadgeProps>) {
  const { t } = useI18n();

  const getColorClasses = () => {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
      case RiskLevel.MEDIUM:
        return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100';
      case RiskLevel.HIGH:
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100';
      default:
        return '';
    }
  };

  const riskLevelLabel = t(`badge.riskLevel.${riskLevel}`);
  const tooltipText = t('badge.risk.criteriaTooltip').replace('{count}', String(criteriaCount));

  let titleAttr: string | undefined;
  if (showTooltip) {
    titleAttr = tooltipText;
  }

  return (
    <Badge variant="outline" className={cn(getColorClasses(), className)} title={titleAttr}>
      <span className="flex items-center gap-1.5">
        <span>{riskLevelLabel}</span>
        <span className="inline-flex items-center justify-center rounded bg-white/50 px-1 text-[10px] font-semibold">
          {criteriaCount}/9
        </span>
      </span>
    </Badge>
  );
}
