'use client';

import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RiskCriterionTooltip } from '@/components/domain/article-tooltip';

interface CriterionCardProps {
  code: string;
  label: string;
  description: string;
  locale: string;
  isChecked: boolean;
  isDisabled: boolean;
  isSensitiveDataCriterion: boolean;
  hasSensitiveData: boolean;
  onToggle: (code: string) => void;
}

export function CriterionCard({
  code,
  label,
  description,
  locale,
  isChecked,
  isDisabled,
  isSensitiveDataCriterion,
  hasSensitiveData,
  onToggle,
}: Readonly<CriterionCardProps>) {
  const handleChange = useCallback(() => onToggle(code), [code, onToggle]);

  let containerClass: string;
  if (isChecked) {
    containerClass = 'bg-[var(--primary-50)] border-[var(--primary-100)]';
  } else {
    containerClass = 'bg-[var(--surface)] hover:bg-[var(--surface-2)]';
  }
  let cursorClass: string;
  if (isDisabled) {
    cursorClass = 'cursor-not-allowed';
  } else {
    cursorClass = 'cursor-pointer';
  }
  let autoBadgeLabel: string;
  if (locale === 'fr') {
    autoBadgeLabel = 'Auto (étape 2)';
  } else {
    autoBadgeLabel = 'Auto (step 2)';
  }

  const inputId = `criterion-${code}`;
  return (
    <div className={cn('border rounded-lg p-4 transition-colors', containerClass)}>
      <label htmlFor={inputId} className={cn('flex items-start gap-3', cursorClass)}>
        <input
          id={inputId}
          type="checkbox"
          checked={isChecked}
          onChange={handleChange}
          disabled={isDisabled}
          aria-label={label}
          className={cn(
            'w-5 h-5 rounded border-[var(--a30-border)] text-[var(--primary)] focus:ring-[var(--primary)] mt-0.5',
            isDisabled && 'opacity-60',
          )}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <RiskCriterionTooltip criterion={code}>
              <span className="font-medium text-[var(--ink)] border-b border-dotted border-[var(--a30-border)]">
                {label}
              </span>
            </RiskCriterionTooltip>
            {isSensitiveDataCriterion && hasSensitiveData && (
              <Badge
                variant="outline"
                className="text-xs bg-orange-100 text-orange-700 border-orange-200"
              >
                {autoBadgeLabel}
              </Badge>
            )}
          </div>
          <p className="text-sm text-[var(--ink-3)] mt-1">{description}</p>
        </div>
      </label>
    </div>
  );
}
