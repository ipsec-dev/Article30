'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/context';

interface CompletenessBadgeProps {
  score: number;
  className?: string;
  showLabel?: boolean;
}

/**
 * Completeness badge showing a progress bar with percentage.
 * Colors: red (< 50%), orange (50-80%), green (> 80%)
 */
const SCORE_MAX = 100;
const SCORE_MIN = 0;
const SCORE_LOW_THRESHOLD = 50;
const SCORE_HIGH_THRESHOLD = 80;

export function CompletenessBadge({
  score,
  className,
  showLabel = true,
}: Readonly<CompletenessBadgeProps>) {
  const { t } = useI18n();

  const clampedScore = Math.min(SCORE_MAX, Math.max(SCORE_MIN, score));

  const getColorClasses = () => {
    if (clampedScore < SCORE_LOW_THRESHOLD) {
      return {
        bar: 'bg-red-500',
        text: 'text-red-700',
        track: 'bg-red-100',
      };
    }
    if (clampedScore <= SCORE_HIGH_THRESHOLD) {
      return {
        bar: 'bg-orange-500',
        text: 'text-orange-700',
        track: 'bg-orange-100',
      };
    }
    return {
      bar: 'bg-green-500',
      text: 'text-green-700',
      track: 'bg-green-100',
    };
  };

  const colors = getColorClasses();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
          {t('badge.completeness.title')}
        </span>
      )}
      <div className="flex items-center gap-2">
        <div className={cn('h-2 w-20 overflow-hidden rounded-full', colors.track)}>
          <div
            className={cn('h-full rounded-full transition-all duration-300', colors.bar)}
            style={{ width: `${clampedScore}%` }}
          />
        </div>
        <span className={cn('text-xs font-semibold', colors.text)}>
          {Math.round(clampedScore)}%
        </span>
      </div>
    </div>
  );
}
