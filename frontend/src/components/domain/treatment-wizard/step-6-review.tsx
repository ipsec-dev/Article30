'use client';

import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useI18n } from '@/i18n/context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LEGAL_BASES,
  PERSON_CATEGORIES,
  DATA_CATEGORIES,
  SENSITIVE_DATA_CATEGORIES,
  RECIPIENT_TYPES,
  GUARANTEE_TYPES,
  SECURITY_MEASURES,
  RISK_CRITERIA,
  RiskLevel,
  FreshnessStatus,
  COMPLETENESS_WEIGHTS,
} from '@article30/shared';
import { CompletenessBadge } from '@/components/domain/completeness-badge';
import { RiskBadge } from '@/components/domain/risk-badge';
import { FreshnessBadge } from '@/components/domain/freshness-badge';
import type { TreatmentWizardFormData } from './types';

const HIGH_RISK_THRESHOLD = 2;
const NOT_PROVIDED_FR = 'Non renseigne';
const NOT_PROVIDED_EN = 'Not provided';
const NONE_FR = 'Aucune';
const NONE_EN = 'None';

type Step6ReviewProps = Readonly<{
  treatmentId?: string;
}>;

type LabelItem = { code: string; labelFr: string; labelEn: string };

type LabelResolver = (code: string, list: readonly LabelItem[]) => string;

type SectionProps = Readonly<{
  title: string;
  children: React.ReactNode;
  isEmpty?: boolean;
  locale: string;
}>;

function Section({ title, children, isEmpty, locale }: SectionProps) {
  let notProvidedLabel: string;
  if (locale === 'fr') {
    notProvidedLabel = NOT_PROVIDED_FR;
  } else {
    notProvidedLabel = NOT_PROVIDED_EN;
  }
  let content: React.ReactNode;
  if (isEmpty) {
    content = <p className="text-sm text-[var(--ink-4)] italic">{notProvidedLabel}</p>;
  } else {
    content = children;
  }
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-[var(--surface-2)] px-4 py-2 border-b">
        <h3 className="font-medium text-[var(--ink)]">{title}</h3>
      </div>
      <div className="p-4">{content}</div>
    </div>
  );
}

function NotProvided({ locale }: Readonly<{ locale: string }>) {
  let label: string;
  if (locale === 'fr') {
    label = NOT_PROVIDED_FR;
  } else {
    label = NOT_PROVIDED_EN;
  }
  return <span className="text-[var(--ink-4)] italic">{label}</span>;
}

function getCriteriaCountClasses(count: number): string {
  if (count >= HIGH_RISK_THRESHOLD) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (count === 1) {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  }
  return 'bg-green-100 text-green-800 border-green-200';
}

type CompletenessRule = {
  weightKey: keyof typeof COMPLETENESS_WEIGHTS;
  isComplete: (f: TreatmentWizardFormData) => boolean;
};

function hasText(v: string | undefined | null): boolean {
  return Boolean(v?.trim());
}

function hasItems(v: readonly unknown[] | undefined | null): boolean {
  return Boolean(v && v.length > 0);
}

const COMPLETENESS_RULES: ReadonlyArray<CompletenessRule> = [
  { weightKey: 'name', isComplete: f => hasText(f.name) },
  { weightKey: 'purpose', isComplete: f => hasText(f.purpose) },
  { weightKey: 'legalBasis', isComplete: f => Boolean(f.legalBasis) },
  { weightKey: 'personCategories', isComplete: f => hasItems(f.personCategories) },
  { weightKey: 'dataCategories', isComplete: f => hasItems(f.dataCategories) },
  { weightKey: 'recipients', isComplete: f => hasItems(f.recipients) },
  { weightKey: 'retentionPeriod', isComplete: f => hasText(f.retentionPeriod) },
  { weightKey: 'securityMeasures', isComplete: f => hasItems(f.securityMeasures) },
  { weightKey: 'transfers', isComplete: f => hasItems(f.transfers) },
  // Count sensitive categories whenever sensitive data is not flagged, or when flagged with categories provided
  {
    weightKey: 'sensitiveCategories',
    isComplete: f => !f.hasSensitiveData || hasItems(f.sensitiveCategories),
  },
  // Risk criteria are always "complete" since they're checkboxes
  { weightKey: 'riskCriteria', isComplete: () => true },
];

function computeCompletenessScore(formData: TreatmentWizardFormData): number {
  return COMPLETENESS_RULES.reduce((acc, rule) => {
    if (rule.isComplete(formData)) {
      return acc + COMPLETENESS_WEIGHTS[rule.weightKey];
    }
    return acc;
  }, 0);
}

interface RiskSummary {
  riskLevel: RiskLevel;
  criteriaCount: number;
  aipdRequired: boolean;
}

function computeRiskSummary(formData: TreatmentWizardFormData): RiskSummary {
  const count = [
    formData.hasEvaluationScoring,
    formData.hasAutomatedDecisions,
    formData.hasSystematicMonitoring,
    formData.hasSensitiveData,
    formData.isLargeScale,
    formData.hasCrossDatasetLinking,
    formData.involvesVulnerablePersons,
    formData.usesInnovativeTech,
    formData.canExcludeFromRights,
  ].filter(Boolean).length;

  let level: RiskLevel;
  if (count >= HIGH_RISK_THRESHOLD) {
    level = RiskLevel.HIGH;
  } else if (count === 1) {
    level = RiskLevel.MEDIUM;
  } else {
    level = RiskLevel.LOW;
  }

  return {
    riskLevel: level,
    criteriaCount: count,
    aipdRequired: count >= HIGH_RISK_THRESHOLD,
  };
}

interface Step6Labels {
  reviewSubtitle: string;
  subPurposesLabel: string;
  noneLabel: string;
  retentionPrefix: string;
  sensitiveFallback: string;
  viewDocumentLabel: string;
  identifiedCriteriaLabel: string;
  noCriteriaLabel: string;
  editNoteLabel: string;
}

function getStep6Labels(isFr: boolean): Step6Labels {
  if (isFr) {
    return {
      reviewSubtitle: 'Verifiez les informations avant de soumettre',
      subPurposesLabel: 'Sous-finalites',
      noneLabel: NONE_FR,
      retentionPrefix: 'Conservation: ',
      sensitiveFallback: 'Donnees sensibles mais categories non precisees',
      viewDocumentLabel: 'Voir document',
      identifiedCriteriaLabel: 'Criteres identifies',
      noCriteriaLabel: 'Aucun critere de risque identifie',
      editNoteLabel:
        "Vous modifiez un traitement existant. Les modifications seront enregistrees dans l'historique d'audit.",
    };
  }
  return {
    reviewSubtitle: 'Review the information before submitting',
    subPurposesLabel: 'Sub-purposes',
    noneLabel: NONE_EN,
    retentionPrefix: 'Retention: ',
    sensitiveFallback: 'Sensitive data but categories not specified',
    viewDocumentLabel: 'View document',
    identifiedCriteriaLabel: 'Identified criteria',
    noCriteriaLabel: 'No risk criteria identified',
    editNoteLabel:
      'You are editing an existing treatment. Changes will be recorded in the audit log.',
  };
}

const RISK_CRITERIA_FIELDS: ReadonlyArray<{
  code: string;
  getter: (formData: TreatmentWizardFormData) => boolean | undefined;
}> = [
  { code: 'EVALUATION_SCORING', getter: f => f.hasEvaluationScoring },
  { code: 'AUTOMATED_DECISIONS', getter: f => f.hasAutomatedDecisions },
  { code: 'SYSTEMATIC_MONITORING', getter: f => f.hasSystematicMonitoring },
  { code: 'SENSITIVE_DATA', getter: f => f.hasSensitiveData },
  { code: 'LARGE_SCALE', getter: f => f.isLargeScale },
  { code: 'CROSS_DATASET', getter: f => f.hasCrossDatasetLinking },
  { code: 'VULNERABLE_PERSONS', getter: f => f.involvesVulnerablePersons },
  { code: 'INNOVATIVE_TECH', getter: f => f.usesInnovativeTech },
  { code: 'EXCLUSION_RIGHTS', getter: f => f.canExcludeFromRights },
];

function isRiskCriterionChecked(code: string, formData: TreatmentWizardFormData): boolean {
  const entry = RISK_CRITERIA_FIELDS.find(e => e.code === code);
  return Boolean(entry?.getter(formData));
}

type IndicatorsRowProps = Readonly<{
  completenessScore: number;
  riskLevel: RiskLevel;
  criteriaCount: number;
}>;

function IndicatorsRow({ completenessScore, riskLevel, criteriaCount }: IndicatorsRowProps) {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-[var(--surface-2)] rounded-lg">
      <CompletenessBadge score={completenessScore} />
      <RiskBadge riskLevel={riskLevel} criteriaCount={criteriaCount} />
      <FreshnessBadge
        freshnessStatus={FreshnessStatus.FRESH}
        nextReviewAt={null}
        showDays={false}
      />
    </div>
  );
}

type AipdWarningProps = Readonly<{
  t: (key: string) => string;
}>;

function AipdWarning({ t }: AipdWarningProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <h4 className="font-medium text-red-800">{t('aipd.required')}</h4>
          <p className="text-sm text-red-700 mt-1">{t('aipd.warning')}</p>
        </div>
      </div>
    </div>
  );
}

type IdentificationSectionProps = Readonly<{
  formData: TreatmentWizardFormData;
  subPurposesLabel: string;
  locale: string;
  getLabel: LabelResolver;
  t: (key: string) => string;
}>;

function IdentificationSection({
  formData,
  subPurposesLabel,
  locale,
  getLabel,
  t,
}: IdentificationSectionProps) {
  return (
    <Section title={t('wizard.step.identification')} locale={locale}>
      <dl className="space-y-3">
        <div>
          <dt className="text-xs font-medium text-[var(--ink-3)] uppercase">
            {t('treatment.name')}
          </dt>
          <dd className="mt-1 text-sm text-[var(--ink)]">
            {formData.name || <NotProvided locale={locale} />}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--ink-3)] uppercase">
            {t('treatment.purpose')}
          </dt>
          <dd className="mt-1 text-sm text-[var(--ink)] whitespace-pre-wrap">
            {formData.purpose || <NotProvided locale={locale} />}
          </dd>
        </div>
        {formData.subPurposes?.length > 0 && (
          <div>
            <dt className="text-xs font-medium text-[var(--ink-3)] uppercase">
              {subPurposesLabel}
            </dt>
            <dd className="mt-1">
              <ul className="list-disc list-inside text-sm text-[var(--ink)]">
                {formData.subPurposes.map((sp, i) => (
                  <li key={`sp-${i}-${sp}`}>{sp}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-medium text-[var(--ink-3)] uppercase">
            {t('treatment.legalBasis')}
          </dt>
          <dd className="mt-1 text-sm text-[var(--ink)]">
            {formData.legalBasis && getLabel(formData.legalBasis, LEGAL_BASES)}
            {!formData.legalBasis && <NotProvided locale={locale} />}
          </dd>
        </div>
      </dl>
    </Section>
  );
}

type PersonCategoriesFieldProps = Readonly<{
  formData: TreatmentWizardFormData;
  noneLabel: string;
  getLabel: LabelResolver;
  t: (key: string) => string;
}>;

function PersonCategoriesField({ formData, noneLabel, getLabel, t }: PersonCategoriesFieldProps) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--ink-3)] uppercase">
        {t('treatment.personCategories')}
      </dt>
      <dd className="mt-1">
        {formData.personCategories?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {formData.personCategories.map(code => (
              <Badge key={code} variant="secondary" className="text-xs">
                {getLabel(code, PERSON_CATEGORIES)}
              </Badge>
            ))}
          </div>
        )}
        {!formData.personCategories?.length && (
          <span className="text-sm text-[var(--ink-4)] italic">{noneLabel}</span>
        )}
      </dd>
    </div>
  );
}

type DataCategoriesFieldProps = Readonly<{
  formData: TreatmentWizardFormData;
  noneLabel: string;
  retentionPrefix: string;
  getLabel: LabelResolver;
  t: (key: string) => string;
}>;

function DataCategoriesField({
  formData,
  noneLabel,
  retentionPrefix,
  getLabel,
  t,
}: DataCategoriesFieldProps) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--ink-3)] uppercase">
        {t('treatment.dataCategories')}
      </dt>
      <dd className="mt-1">
        {formData.dataCategories?.length > 0 && (
          <div className="space-y-2">
            {formData.dataCategories.map((dc, i) => (
              <div
                key={`dc-${i}-${dc.category}`}
                className="text-sm border-l-2 border-[var(--a30-border)] pl-3"
              >
                <span className="font-medium">{getLabel(dc.category, DATA_CATEGORIES)}</span>
                {dc.description && <p className="text-[var(--ink-2)]">{dc.description}</p>}
                {dc.retentionPeriod && (
                  <p className="text-[var(--ink-3)] text-xs">
                    {retentionPrefix}
                    {dc.retentionPeriod}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {!formData.dataCategories?.length && (
          <span className="text-sm text-[var(--ink-4)] italic">{noneLabel}</span>
        )}
      </dd>
    </div>
  );
}

type SensitiveCategoriesFieldProps = Readonly<{
  formData: TreatmentWizardFormData;
  sensitiveFallback: string;
  getLabel: LabelResolver;
  t: (key: string) => string;
}>;

function SensitiveCategoriesField({
  formData,
  sensitiveFallback,
  getLabel,
  t,
}: SensitiveCategoriesFieldProps) {
  if (!formData.hasSensitiveData) {
    return null;
  }
  return (
    <div className="p-3 bg-orange-50 border border-orange-200 rounded">
      <dt className="text-xs font-medium text-orange-800 uppercase">
        {t('treatment.sensitiveCategories')}
      </dt>
      <dd className="mt-1">
        {formData.sensitiveCategories?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {formData.sensitiveCategories.map(code => (
              <Badge
                key={code}
                variant="outline"
                className="text-xs bg-orange-100 text-orange-800 border-orange-300"
              >
                {getLabel(code, SENSITIVE_DATA_CATEGORIES)}
              </Badge>
            ))}
          </div>
        )}
        {!formData.sensitiveCategories?.length && (
          <span className="text-sm text-orange-600 italic">{sensitiveFallback}</span>
        )}
      </dd>
    </div>
  );
}

type DataSectionProps = Readonly<{
  formData: TreatmentWizardFormData;
  noneLabel: string;
  retentionPrefix: string;
  sensitiveFallback: string;
  locale: string;
  getLabel: LabelResolver;
  t: (key: string) => string;
}>;

function DataSection({
  formData,
  noneLabel,
  retentionPrefix,
  sensitiveFallback,
  locale,
  getLabel,
  t,
}: DataSectionProps) {
  return (
    <Section title={t('wizard.step.data')} locale={locale}>
      <dl className="space-y-3">
        <PersonCategoriesField
          formData={formData}
          noneLabel={noneLabel}
          getLabel={getLabel}
          t={t}
        />
        <DataCategoriesField
          formData={formData}
          noneLabel={noneLabel}
          retentionPrefix={retentionPrefix}
          getLabel={getLabel}
          t={t}
        />
        <SensitiveCategoriesField
          formData={formData}
          sensitiveFallback={sensitiveFallback}
          getLabel={getLabel}
          t={t}
        />
      </dl>
    </Section>
  );
}

type RecipientsFieldProps = Readonly<{
  formData: TreatmentWizardFormData;
  getLabel: LabelResolver;
  t: (key: string) => string;
}>;

function RecipientsField({ formData, getLabel, t }: RecipientsFieldProps) {
  if (!formData.recipients?.length) {
    return null;
  }
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--ink-3)] uppercase">
        {t('treatment.recipientTypes')}
      </dt>
      <dd className="mt-1 space-y-2">
        {formData.recipients.map((r, i) => (
          <div
            key={`r-${i}-${r.type}`}
            className="text-sm border-l-2 border-[var(--a30-border)] pl-3"
          >
            <span className="font-medium">{getLabel(r.type, RECIPIENT_TYPES)}</span>
            {r.precision && <p className="text-[var(--ink-2)]">{r.precision}</p>}
          </div>
        ))}
      </dd>
    </div>
  );
}

type TransfersFieldProps = Readonly<{
  formData: TreatmentWizardFormData;
  viewDocumentLabel: string;
  getLabel: LabelResolver;
  t: (key: string) => string;
}>;

function TransfersField({ formData, viewDocumentLabel, getLabel, t }: TransfersFieldProps) {
  if (!formData.transfers?.length) {
    return null;
  }
  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded">
      <dt className="text-xs font-medium text-amber-800 uppercase">{t('treatment.transfers')}</dt>
      <dd className="mt-1 space-y-2">
        {formData.transfers.map((tr, i) => (
          <div
            key={`tr-${i}-${tr.destinationOrg}`}
            className="text-sm border-l-2 border-amber-300 pl-3"
          >
            <span className="font-medium">{tr.destinationOrg}</span>
            <span className="text-[var(--ink-2)]"> - {tr.country}</span>
            <p className="text-[var(--ink-2)]">{getLabel(tr.guaranteeType, GUARANTEE_TYPES)}</p>
            {tr.documentLink && (
              <a
                href={tr.documentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline text-xs"
              >
                {viewDocumentLabel}
              </a>
            )}
          </div>
        ))}
      </dd>
    </div>
  );
}

type RecipientsSectionProps = Readonly<{
  formData: TreatmentWizardFormData;
  viewDocumentLabel: string;
  locale: string;
  getLabel: LabelResolver;
  t: (key: string) => string;
}>;

function RecipientsSection({
  formData,
  viewDocumentLabel,
  locale,
  getLabel,
  t,
}: RecipientsSectionProps) {
  const isEmpty = !formData.recipients?.length && !formData.transfers?.length;
  return (
    <Section title={t('wizard.step.recipients')} isEmpty={isEmpty} locale={locale}>
      <dl className="space-y-3">
        <RecipientsField formData={formData} getLabel={getLabel} t={t} />
        <TransfersField
          formData={formData}
          viewDocumentLabel={viewDocumentLabel}
          getLabel={getLabel}
          t={t}
        />
      </dl>
    </Section>
  );
}

type SecurityMeasuresFieldProps = Readonly<{
  formData: TreatmentWizardFormData;
  noneLabel: string;
  getLabel: LabelResolver;
  t: (key: string) => string;
}>;

function SecurityMeasuresField({ formData, noneLabel, getLabel, t }: SecurityMeasuresFieldProps) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--ink-3)] uppercase">
        {t('treatment.securityMeasures')}
      </dt>
      <dd className="mt-1">
        {formData.securityMeasures?.length > 0 && (
          <div className="space-y-2">
            {formData.securityMeasures.map((sm, i) => (
              <div
                key={`sm-${i}-${sm.type}`}
                className="text-sm border-l-2 border-[var(--a30-border)] pl-3"
              >
                <span className="font-medium">
                  {getLabel(sm.type, SECURITY_MEASURES) || sm.type}
                </span>
                {sm.precision && <p className="text-[var(--ink-2)]">{sm.precision}</p>}
              </div>
            ))}
          </div>
        )}
        {!formData.securityMeasures?.length && (
          <span className="text-sm text-[var(--ink-4)] italic">{noneLabel}</span>
        )}
      </dd>
    </div>
  );
}

type SecuritySectionProps = Readonly<{
  formData: TreatmentWizardFormData;
  noneLabel: string;
  locale: string;
  getLabel: LabelResolver;
  t: (key: string) => string;
}>;

function SecuritySection({ formData, noneLabel, locale, getLabel, t }: SecuritySectionProps) {
  return (
    <Section title={t('wizard.step.security')} locale={locale}>
      <dl className="space-y-3">
        <div>
          <dt className="text-xs font-medium text-[var(--ink-3)] uppercase">
            {t('treatment.retentionPeriod')}
          </dt>
          <dd className="mt-1 text-sm text-[var(--ink)]">
            {formData.retentionPeriod || <NotProvided locale={locale} />}
          </dd>
        </div>
        <SecurityMeasuresField
          formData={formData}
          noneLabel={noneLabel}
          getLabel={getLabel}
          t={t}
        />
      </dl>
    </Section>
  );
}

type RiskCriteriaListProps = Readonly<{
  formData: TreatmentWizardFormData;
  criteriaCount: number;
  noCriteriaLabel: string;
  t: (key: string) => string;
}>;

function RiskCriteriaList({ formData, criteriaCount, noCriteriaLabel, t }: RiskCriteriaListProps) {
  const activeCriteria = useMemo(
    () => RISK_CRITERIA.filter(criterion => isRiskCriterionChecked(criterion.code, formData)),
    [formData],
  );
  if (criteriaCount === 0) {
    return <span className="text-sm text-green-600">{noCriteriaLabel}</span>;
  }
  return (
    <ul className="space-y-1">
      {activeCriteria.map(criterion => (
        <li key={criterion.code} className="flex items-center gap-2 text-sm">
          <svg
            className="w-4 h-4 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {t(`riskCriteria.${criterion.code}`)}
        </li>
      ))}
    </ul>
  );
}

type RiskSectionProps = Readonly<{
  formData: TreatmentWizardFormData;
  criteriaCount: number;
  identifiedCriteriaLabel: string;
  noCriteriaLabel: string;
  locale: string;
  t: (key: string) => string;
}>;

function RiskSection({
  formData,
  criteriaCount,
  identifiedCriteriaLabel,
  noCriteriaLabel,
  locale,
  t,
}: RiskSectionProps) {
  return (
    <Section title={t('wizard.step.riskAssessment')} locale={locale}>
      <dl className="space-y-3">
        <div className="flex items-center justify-between">
          <dt className="text-xs font-medium text-[var(--ink-3)] uppercase">
            {t('aipd.criteriaCount')}
          </dt>
          <dd>
            <Badge
              variant="outline"
              className={cn('text-sm', getCriteriaCountClasses(criteriaCount))}
            >
              {criteriaCount}/9
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--ink-3)] uppercase mb-2">
            {identifiedCriteriaLabel}
          </dt>
          <dd>
            <RiskCriteriaList
              formData={formData}
              criteriaCount={criteriaCount}
              noCriteriaLabel={noCriteriaLabel}
              t={t}
            />
          </dd>
        </div>
      </dl>
    </Section>
  );
}

type EditNoteProps = Readonly<{
  editNoteLabel: string;
}>;

function EditNote({ editNoteLabel }: EditNoteProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-sm text-blue-700">{editNoteLabel}</p>
    </div>
  );
}

type ReviewHeaderProps = Readonly<{
  reviewSubtitle: string;
  t: (key: string) => string;
}>;

function ReviewHeader({ reviewSubtitle, t }: ReviewHeaderProps) {
  return (
    <div className="border-b pb-4 mb-6">
      <h2 className="text-lg font-semibold text-[var(--ink)]">{t('wizard.step.summary')}</h2>
      <p className="text-sm text-[var(--ink-3)] mt-1">{reviewSubtitle}</p>
    </div>
  );
}

function buildLabelResolver(isFr: boolean): LabelResolver {
  return (code, list) => {
    const item = list.find(i => i.code === code);
    if (!item) {
      return code;
    }
    if (isFr) {
      return item.labelFr;
    }
    return item.labelEn;
  };
}

export function Step6Review({ treatmentId }: Step6ReviewProps) {
  const { t, locale } = useI18n();
  const { watch } = useFormContext<TreatmentWizardFormData>();

  const formData = watch();

  const completenessScore = useMemo(() => computeCompletenessScore(formData), [formData]);

  const { riskLevel, criteriaCount, aipdRequired } = useMemo(
    () => computeRiskSummary(formData),
    [formData],
  );

  const isFr = locale === 'fr';
  const getLabel: LabelResolver = buildLabelResolver(isFr);

  const {
    reviewSubtitle,
    subPurposesLabel,
    noneLabel,
    retentionPrefix,
    sensitiveFallback,
    viewDocumentLabel,
    identifiedCriteriaLabel,
    noCriteriaLabel,
    editNoteLabel,
  } = getStep6Labels(isFr);

  return (
    <div className="space-y-6">
      <ReviewHeader reviewSubtitle={reviewSubtitle} t={t} />

      <IndicatorsRow
        completenessScore={completenessScore}
        riskLevel={riskLevel}
        criteriaCount={criteriaCount}
      />

      {aipdRequired && <AipdWarning t={t} />}

      <IdentificationSection
        formData={formData}
        subPurposesLabel={subPurposesLabel}
        locale={locale}
        getLabel={getLabel}
        t={t}
      />

      <DataSection
        formData={formData}
        noneLabel={noneLabel}
        retentionPrefix={retentionPrefix}
        sensitiveFallback={sensitiveFallback}
        locale={locale}
        getLabel={getLabel}
        t={t}
      />

      <RecipientsSection
        formData={formData}
        viewDocumentLabel={viewDocumentLabel}
        locale={locale}
        getLabel={getLabel}
        t={t}
      />

      <SecuritySection
        formData={formData}
        noneLabel={noneLabel}
        locale={locale}
        getLabel={getLabel}
        t={t}
      />

      <RiskSection
        formData={formData}
        criteriaCount={criteriaCount}
        identifiedCriteriaLabel={identifiedCriteriaLabel}
        noCriteriaLabel={noCriteriaLabel}
        locale={locale}
        t={t}
      />

      {treatmentId && <EditNote editNoteLabel={editNoteLabel} />}
    </div>
  );
}
