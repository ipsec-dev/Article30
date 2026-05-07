'use client';

import { useI18n } from '@/i18n/context';
import { ArticleTooltip } from '@/components/domain/article-tooltip';
import { RiskLevelDisplay } from './step-5-risk-level-display';
import { AipdWarning } from './step-5-aipd-warning';
import { CriteriaList } from './step-5-criteria-list';
import { ConclusionPanel } from './step-5-conclusion';
import { useStep5Criteria } from './step-5-use-criteria';
import { getStep5Labels } from './step-5-labels';

const TOTAL_CRITERIA = 9;
const PERCENT = 100;

export function Step5Risk() {
  const { t, locale } = useI18n();
  const {
    criteriaCount,
    riskLevel,
    aipdRequired,
    hasSensitiveData,
    getCriterionValue,
    toggleCriterion,
  } = useStep5Criteria();

  const isFr = locale === 'fr';
  const {
    subtitleIntro,
    aipdArticleLabel,
    subtitleTail,
    riskLevelHeading,
    criteriaCountText,
    conclusionSuffix,
  } = getStep5Labels(isFr, criteriaCount);
  const progressBarWidth = `${(criteriaCount / TOTAL_CRITERIA) * PERCENT}%`;
  let conclusionMainText: string;
  if (aipdRequired) {
    conclusionMainText = t('aipd.required');
  } else {
    conclusionMainText = t('aipd.notRequired');
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">
          {t('wizard.step.riskAssessment')}
        </h2>
        <p className="text-sm text-[var(--ink-3)] mt-1">
          {subtitleIntro}
          <ArticleTooltip article="35">{aipdArticleLabel}</ArticleTooltip>
          {subtitleTail}
        </p>
      </div>

      <RiskLevelDisplay
        riskLevel={riskLevel}
        locale={locale}
        riskLevelHeading={riskLevelHeading}
        criteriaCountText={criteriaCountText}
        progressBarWidth={progressBarWidth}
      />

      {aipdRequired && <AipdWarning title={t('aipd.required')} message={t('aipd.warning')} />}

      <CriteriaList
        label={t('treatment.riskCriteria')}
        locale={locale}
        hasSensitiveData={hasSensitiveData}
        getCriterionValue={getCriterionValue}
        toggleCriterion={toggleCriterion}
        translateLabel={code => t(`riskCriteria.${code}`)}
        translateDescription={code => t(`riskCriteria.${code}.description`)}
      />

      <ConclusionPanel
        aipdRequired={aipdRequired}
        mainText={conclusionMainText}
        suffix={conclusionSuffix}
      />
    </div>
  );
}
