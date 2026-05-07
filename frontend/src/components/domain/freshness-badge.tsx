'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/context';
import { FreshnessStatus } from '@article30/shared';

interface FreshnessBadgeProps {
  freshnessStatus: FreshnessStatus;
  nextReviewAt?: string | null;
  className?: string;
  showDays?: boolean;
}

/**
 * Freshness badge showing freshness status and days until next review.
 * Colors: green (FRESH), orange (PENDING_REVIEW), red (OUTDATED)
 */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function FreshnessBadge({
  freshnessStatus,
  nextReviewAt,
  className,
  showDays = true,
}: Readonly<FreshnessBadgeProps>) {
  const { t } = useI18n();

  const getColorClasses = () => {
    switch (freshnessStatus) {
      case FreshnessStatus.FRESH:
        return 'text-green-800 border-green-200 hover:bg-green-100';
      case FreshnessStatus.PENDING_REVIEW:
        return 'text-orange-800 border-orange-200 hover:bg-orange-100';
      case FreshnessStatus.OUTDATED:
        return 'text-red-800 border-red-200 hover:bg-red-100';
      default:
        return 'border-[var(--a30-border)]';
    }
  };

  const getDaysInfo = (): { text: string; days: number | null } => {
    if (!nextReviewAt) {
      return { text: t('badge.freshness.noDueDate'), days: null };
    }

    const now = new Date();
    const reviewDate = new Date(nextReviewAt);
    const diffTime = reviewDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / MS_PER_DAY);

    if (diffDays === 0) {
      return { text: t('badge.freshness.reviewToday'), days: 0 };
    }

    if (diffDays > 0) {
      return {
        text: t('badge.freshness.daysUntilReview').replace('{days}', String(diffDays)),
        days: diffDays,
      };
    }

    return {
      text: t('badge.freshness.daysOverdue').replace('{days}', String(Math.abs(diffDays))),
      days: diffDays,
    };
  };

  const statusLabel = t(`badge.freshness.${freshnessStatus}`);
  const daysInfo = getDaysInfo();

  let titleAttr: string | undefined;
  if (showDays && nextReviewAt) {
    titleAttr = daysInfo.text;
  }

  let daysLabel = '';
  if (daysInfo.days !== null) {
    if (daysInfo.days > 0) {
      daysLabel = `${daysInfo.days}j`;
    } else {
      daysLabel = `${Math.abs(daysInfo.days)}j`;
    }
  }

  return (
    <Badge
      variant="outline"
      className={cn(getColorClasses(), className)}
      title={titleAttr}
      style={{
        backgroundColor: 'var(--surface)',
        backgroundImage: 'linear-gradient(to right, var(--surface-2), var(--surface))',
      }}
    >
      <span className="flex items-center gap-1.5">
        <span>{statusLabel}</span>
        {showDays && nextReviewAt && daysInfo.days !== null && (
          <span className="inline-flex items-center justify-center rounded bg-white/50 px-1 text-[10px] font-semibold">
            {daysLabel}
          </span>
        )}
      </span>
    </Badge>
  );
}
