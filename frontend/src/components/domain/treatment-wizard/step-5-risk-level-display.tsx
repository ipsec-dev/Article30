'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RiskLevel } from '@article30/shared';

function getProgressBarColor(riskLevel: RiskLevel): string {
  if (riskLevel === RiskLevel.LOW) {
    return 'bg-green-500';
  }
  if (riskLevel === RiskLevel.MEDIUM) {
    return 'bg-orange-500';
  }
  return 'bg-red-500';
}

function getRiskLevelClasses(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case RiskLevel.LOW:
      return 'bg-green-100 text-green-800 border-green-200';
    case RiskLevel.MEDIUM:
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case RiskLevel.HIGH:
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--a30-border)]';
  }
}

function getRiskLevelLabel(riskLevel: RiskLevel, locale: string): string {
  const isFrLocale = locale === 'fr';
  switch (riskLevel) {
    case RiskLevel.LOW: {
      if (isFrLocale) {
        return 'Faible';
      }
      return 'Low';
    }
    case RiskLevel.MEDIUM: {
      if (isFrLocale) {
        return 'Moyen';
      }
      return 'Medium';
    }
    case RiskLevel.HIGH: {
      if (isFrLocale) {
        return 'Eleve';
      }
      return 'High';
    }
    default:
      return '';
  }
}

interface RiskLevelDisplayProps {
  riskLevel: RiskLevel;
  locale: string;
  riskLevelHeading: string;
  criteriaCountText: string;
  progressBarWidth: string;
}

export function RiskLevelDisplay({
  riskLevel,
  locale,
  riskLevelHeading,
  criteriaCountText,
  progressBarWidth,
}: Readonly<RiskLevelDisplayProps>) {
  return (
    <div className="bg-[var(--surface-2)] border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-[var(--ink-2)]">{riskLevelHeading}</span>
          <p className="text-xs text-[var(--ink-3)]">{criteriaCountText}</p>
        </div>
        <Badge
          variant="outline"
          className={cn('text-sm px-3 py-1', getRiskLevelClasses(riskLevel))}
        >
          {getRiskLevelLabel(riskLevel, locale)}
        </Badge>
      </div>

      <div className="w-full bg-[var(--surface-2)] rounded-full h-2">
        <div
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            getProgressBarColor(riskLevel),
          )}
          style={{ width: progressBarWidth }}
        />
      </div>
    </div>
  );
}
