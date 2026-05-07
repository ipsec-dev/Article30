import type { Organization, Prisma, Treatment } from '@prisma/client';
import {
  COMPLETENESS_WEIGHTS,
  FreshnessStatus,
  RiskLevel,
  TreatmentIndicators,
} from '@article30/shared';

export const RISK_THRESHOLD_HIGH = 4;
export const RISK_THRESHOLD_MEDIUM = 2;
const DAYS_IN_MONTH = 30;
const MS_PER_MONTH = 1000 * 60 * 60 * 24 * DAYS_IN_MONTH;

export function computeRiskLevel(treatment: Treatment): {
  riskLevel: RiskLevel;
  criteriaCount: number;
  aipdRequired: boolean;
} {
  const criteria = [
    treatment.hasEvaluationScoring,
    treatment.hasAutomatedDecisions,
    treatment.hasSystematicMonitoring,
    treatment.hasSensitiveData,
    treatment.isLargeScale,
    treatment.hasCrossDatasetLinking,
    treatment.involvesVulnerablePersons,
    treatment.usesInnovativeTech,
    treatment.canExcludeFromRights,
  ];

  const criteriaCount = criteria.filter(Boolean).length;

  let riskLevel: RiskLevel;
  if (criteriaCount >= RISK_THRESHOLD_HIGH) {
    riskLevel = RiskLevel.HIGH;
  } else if (criteriaCount >= RISK_THRESHOLD_MEDIUM) {
    riskLevel = RiskLevel.MEDIUM;
  } else {
    riskLevel = RiskLevel.LOW;
  }

  return { riskLevel, criteriaCount, aipdRequired: criteriaCount >= RISK_THRESHOLD_MEDIUM };
}

function computeBasicFieldsScore(
  treatment: Treatment,
  weights: typeof COMPLETENESS_WEIGHTS,
): number {
  let score = 0;
  if (treatment.name) {
    score += weights.name;
  }
  if (treatment.purpose) {
    score += weights.purpose;
  }
  if (treatment.legalBasis) {
    score += weights.legalBasis;
  }
  if (treatment.personCategories?.length > 0) {
    score += weights.personCategories;
  }
  if (treatment.retentionPeriod) {
    score += weights.retentionPeriod;
  }
  return score;
}

function computeJsonFieldsScore(
  treatment: Treatment,
  weights: typeof COMPLETENESS_WEIGHTS,
): number {
  let score = 0;
  if (treatment.dataCategories && (treatment.dataCategories as Prisma.JsonArray).length > 0) {
    score += weights.dataCategories;
  }
  if (treatment.recipients && (treatment.recipients as Prisma.JsonArray).length > 0) {
    score += weights.recipients;
  }
  if (
    treatment.securityMeasuresDetailed &&
    (treatment.securityMeasuresDetailed as Prisma.JsonArray).length > 0
  ) {
    score += weights.securityMeasures;
  }
  if (treatment.transfers && (treatment.transfers as Prisma.JsonArray).length > 0) {
    score += weights.transfers;
  }
  return score;
}

function computeSensitiveScore(treatment: Treatment, weights: typeof COMPLETENESS_WEIGHTS): number {
  // Sensitive data credit: full if not applicable, or if applicable and categories listed
  const needsSensitiveCategories = treatment.hasSensitiveData;
  if (!needsSensitiveCategories) {
    return weights.sensitiveCategories;
  }
  if (treatment.sensitiveCategories?.length > 0) {
    return weights.sensitiveCategories;
  }
  return 0;
}

function computeRiskFieldsScore(
  treatment: Treatment,
  weights: typeof COMPLETENESS_WEIGHTS,
): number {
  const riskFieldsSet = [
    treatment.hasEvaluationScoring,
    treatment.hasAutomatedDecisions,
    treatment.hasSystematicMonitoring,
    treatment.isLargeScale,
    treatment.hasCrossDatasetLinking,
    treatment.involvesVulnerablePersons,
    treatment.usesInnovativeTech,
    treatment.canExcludeFromRights,
  ].every(v => v !== null && v !== undefined);

  if (riskFieldsSet) {
    return weights.riskCriteria;
  }
  return 0;
}

export function computeCompleteness(treatment: Treatment): number {
  const weights = COMPLETENESS_WEIGHTS;
  return (
    computeBasicFieldsScore(treatment, weights) +
    computeJsonFieldsScore(treatment, weights) +
    computeSensitiveScore(treatment, weights) +
    computeRiskFieldsScore(treatment, weights)
  );
}

export function computeFreshness(treatment: Treatment, org: Organization): FreshnessStatus {
  if (!treatment.lastReviewedAt) {
    return FreshnessStatus.OUTDATED;
  }

  const now = new Date();
  const lastReview = new Date(treatment.lastReviewedAt);
  const monthsSinceReview = (now.getTime() - lastReview.getTime()) / MS_PER_MONTH;

  if (monthsSinceReview < org.freshnessThresholdMonths) {
    return FreshnessStatus.FRESH;
  } else if (monthsSinceReview < org.reviewCycleMonths) {
    return FreshnessStatus.PENDING_REVIEW;
  } else {
    return FreshnessStatus.OUTDATED;
  }
}

export function computeIndicators(treatment: Treatment, org: Organization): TreatmentIndicators {
  const { riskLevel, criteriaCount, aipdRequired } = computeRiskLevel(treatment);

  return {
    riskLevel,
    aipdRequired,
    completenessScore: computeCompleteness(treatment),
    riskCriteriaCount: criteriaCount,
    freshnessStatus: computeFreshness(treatment, org),
  };
}

export function computeIndicatorsOrNull(
  treatment: Treatment,
  org: Organization | null,
): TreatmentIndicators | null {
  if (!org) {
    return null;
  }
  return computeIndicators(treatment, org);
}
