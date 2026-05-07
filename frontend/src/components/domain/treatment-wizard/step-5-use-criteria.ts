'use client';

import { useCallback, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiskLevel } from '@article30/shared';
import type { TreatmentWizardFormData } from './types';

const HIGH_RISK_THRESHOLD = 2;

const CRITERIA_FIELD_MAP: Record<string, keyof TreatmentWizardFormData> = {
  EVALUATION_SCORING: 'hasEvaluationScoring',
  AUTOMATED_DECISIONS: 'hasAutomatedDecisions',
  SYSTEMATIC_MONITORING: 'hasSystematicMonitoring',
  SENSITIVE_DATA: 'hasSensitiveData',
  LARGE_SCALE: 'isLargeScale',
  CROSS_DATASET: 'hasCrossDatasetLinking',
  VULNERABLE_PERSONS: 'involvesVulnerablePersons',
  INNOVATIVE_TECH: 'usesInnovativeTech',
  EXCLUSION_RIGHTS: 'canExcludeFromRights',
};

interface UseCriteriaResult {
  criteriaCount: number;
  riskLevel: RiskLevel;
  aipdRequired: boolean;
  hasSensitiveData: boolean;
  getCriterionValue: (code: string) => boolean;
  toggleCriterion: (code: string) => void;
}

export function useStep5Criteria(): UseCriteriaResult {
  const { setValue, watch } = useFormContext<TreatmentWizardFormData>();

  const hasSensitiveData = watch('hasSensitiveData');
  const hasEvaluationScoring = watch('hasEvaluationScoring');
  const hasAutomatedDecisions = watch('hasAutomatedDecisions');
  const hasSystematicMonitoring = watch('hasSystematicMonitoring');
  const isLargeScale = watch('isLargeScale');
  const hasCrossDatasetLinking = watch('hasCrossDatasetLinking');
  const involvesVulnerablePersons = watch('involvesVulnerablePersons');
  const usesInnovativeTech = watch('usesInnovativeTech');
  const canExcludeFromRights = watch('canExcludeFromRights');

  const criteriaCount = useMemo(() => {
    return [
      hasEvaluationScoring,
      hasAutomatedDecisions,
      hasSystematicMonitoring,
      hasSensitiveData,
      isLargeScale,
      hasCrossDatasetLinking,
      involvesVulnerablePersons,
      usesInnovativeTech,
      canExcludeFromRights,
    ].filter(Boolean).length;
  }, [
    hasEvaluationScoring,
    hasAutomatedDecisions,
    hasSystematicMonitoring,
    hasSensitiveData,
    isLargeScale,
    hasCrossDatasetLinking,
    involvesVulnerablePersons,
    usesInnovativeTech,
    canExcludeFromRights,
  ]);

  const riskLevel = useMemo((): RiskLevel => {
    if (criteriaCount >= HIGH_RISK_THRESHOLD) {
      return RiskLevel.HIGH;
    }
    if (criteriaCount === 1) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.LOW;
  }, [criteriaCount]);

  const aipdRequired = criteriaCount >= HIGH_RISK_THRESHOLD;

  const getCriterionValue = useCallback(
    (code: string): boolean => {
      switch (code) {
        case 'EVALUATION_SCORING':
          return hasEvaluationScoring;
        case 'AUTOMATED_DECISIONS':
          return hasAutomatedDecisions;
        case 'SYSTEMATIC_MONITORING':
          return hasSystematicMonitoring;
        case 'SENSITIVE_DATA':
          return hasSensitiveData;
        case 'LARGE_SCALE':
          return isLargeScale;
        case 'CROSS_DATASET':
          return hasCrossDatasetLinking;
        case 'VULNERABLE_PERSONS':
          return involvesVulnerablePersons;
        case 'INNOVATIVE_TECH':
          return usesInnovativeTech;
        case 'EXCLUSION_RIGHTS':
          return canExcludeFromRights;
        default:
          return false;
      }
    },
    [
      hasEvaluationScoring,
      hasAutomatedDecisions,
      hasSystematicMonitoring,
      hasSensitiveData,
      isLargeScale,
      hasCrossDatasetLinking,
      involvesVulnerablePersons,
      usesInnovativeTech,
      canExcludeFromRights,
    ],
  );

  const toggleCriterion = useCallback(
    (code: string) => {
      const fieldName = CRITERIA_FIELD_MAP[code];
      if (!fieldName) {
        return;
      }

      // SENSITIVE_DATA is auto-derived from step 2 and can only be unchecked there
      if (code === 'SENSITIVE_DATA' && hasSensitiveData) {
        return;
      }

      const currentValue = getCriterionValue(code);
      setValue(fieldName, !currentValue);
    },
    [hasSensitiveData, getCriterionValue, setValue],
  );

  return {
    criteriaCount,
    riskLevel,
    aipdRequired,
    hasSensitiveData,
    getCriterionValue,
    toggleCriterion,
  };
}
