'use client';

import { Label } from '@/components/ui/label';
import { RISK_CRITERIA } from '@article30/shared';
import { CriterionCard } from './step-5-criterion-card';

interface CriteriaListProps {
  label: string;
  locale: string;
  hasSensitiveData: boolean;
  getCriterionValue: (code: string) => boolean;
  toggleCriterion: (code: string) => void;
  translateLabel: (code: string) => string;
  translateDescription: (code: string) => string;
}

export function CriteriaList({
  label,
  locale,
  hasSensitiveData,
  getCriterionValue,
  toggleCriterion,
  translateLabel,
  translateDescription,
}: Readonly<CriteriaListProps>) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {RISK_CRITERIA.map(criterion => {
        const isSensitiveDataCriterion = criterion.code === 'SENSITIVE_DATA';
        return (
          <CriterionCard
            key={criterion.code}
            code={criterion.code}
            label={translateLabel(criterion.code)}
            description={translateDescription(criterion.code)}
            locale={locale}
            isChecked={getCriterionValue(criterion.code)}
            isDisabled={isSensitiveDataCriterion && hasSensitiveData}
            isSensitiveDataCriterion={isSensitiveDataCriterion}
            hasSensitiveData={hasSensitiveData}
            onToggle={toggleCriterion}
          />
        );
      })}
    </div>
  );
}
