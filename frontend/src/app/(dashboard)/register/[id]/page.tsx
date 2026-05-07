'use client';

import { useCallback, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/dates';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useFetch } from '@/lib/hooks/use-fetch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PdfPreviewDialog } from '@/components/domain/pdf-preview-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CompletenessBadge } from '@/components/domain/completeness-badge';
import { RiskBadge } from '@/components/domain/risk-badge';
import { FreshnessBadge } from '@/components/domain/freshness-badge';
import { DocumentList } from '@/components/domain/document-list';
import { Article30Checklist } from '@/components/treatment/article-30-checklist';
import {
  Role,
  TreatmentStatus,
  RiskLevel,
  FreshnessStatus,
  WRITE_ROLES,
  DELETE_ROLES,
  VALIDATE_ROLES,
  EXPORT_ROLES,
  PERSON_CATEGORIES,
  RECIPIENT_TYPES,
  SECURITY_MEASURES,
} from '@article30/shared';
import type { OrganizationDto, TreatmentDto } from '@article30/shared';

const REF_NUMBER_PAD_LENGTH = 4;
const DEFAULT_RISK_CRITERIA_COUNT = 0;
const DEFAULT_COMPLETENESS_SCORE = 0;
const NO_RESULTS_KEY = 'common.noResults';
const EM_DASH = '—';
const DEFAULT_API_URL = 'http://localhost:3001';
const RISK_CRITERIA_TOTAL = 9;

const RISK_CRITERIA_KEYS = [
  { key: 'hasEvaluationScoring', label: 'riskCriteria.EVALUATION_SCORING' },
  { key: 'hasAutomatedDecisions', label: 'riskCriteria.AUTOMATED_DECISIONS' },
  { key: 'hasSystematicMonitoring', label: 'riskCriteria.SYSTEMATIC_MONITORING' },
  { key: 'hasSensitiveData', label: 'riskCriteria.SENSITIVE_DATA' },
  { key: 'isLargeScale', label: 'riskCriteria.LARGE_SCALE' },
  { key: 'hasCrossDatasetLinking', label: 'riskCriteria.CROSS_DATASET' },
  { key: 'involvesVulnerablePersons', label: 'riskCriteria.VULNERABLE_PERSONS' },
  { key: 'usesInnovativeTech', label: 'riskCriteria.INNOVATIVE_TECH' },
  { key: 'canExcludeFromRights', label: 'riskCriteria.EXCLUSION_RIGHTS' },
] as const;

type LocalizedItem = { code: string; labelFr: string; labelEn: string };

function resolveLabel(items: readonly LocalizedItem[], value: string, locale: string): string {
  const item = items.find(i => i.code === value);
  if (!item) {
    return value;
  }
  if (locale === 'fr') {
    return item.labelFr;
  }
  return item.labelEn;
}

interface RiskCriterionCardProps {
  label: string;
  value: boolean;
  t: (key: string) => string;
}

function RiskCriterionCard({ label, value, t }: Readonly<RiskCriterionCardProps>) {
  let wrapperClass = 'border-[var(--a30-border)] bg-[var(--surface-2)]';
  let dotClass = 'bg-[var(--ink-3)]';
  let textClass = 'text-[var(--ink-2)]';
  if (value) {
    wrapperClass = 'border-red-200 bg-red-50';
    dotClass = 'bg-red-500';
    textClass = 'text-red-800';
  }
  return (
    <div className={`flex items-center gap-2 rounded border p-2 text-sm ${wrapperClass}`}>
      <span className={`size-4 flex-shrink-0 rounded-full ${dotClass}`} />
      <span className={textClass}>{t(label)}</span>
    </div>
  );
}

function renderPersonCategories(treatment: TreatmentDto, locale: string): React.ReactNode {
  if (treatment.personCategories.length === 0) {
    return (
      <li className="text-sm" style={{ color: 'var(--ink-3)' }}>
        {EM_DASH}
      </li>
    );
  }
  return treatment.personCategories.map(c => (
    <li key={c} className="text-sm" style={{ color: 'var(--ink)' }}>
      {resolveLabel(PERSON_CATEGORIES, c, locale)}
    </li>
  ));
}

function renderDataCategories(treatment: TreatmentDto): React.ReactNode {
  if (!Array.isArray(treatment.dataCategories) || treatment.dataCategories.length === 0) {
    return (
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
        {EM_DASH}
      </p>
    );
  }
  return (
    <ul className="mt-1 space-y-1">
      {treatment.dataCategories.map(dc => (
        <li
          key={`${dc.category}-${dc.retentionPeriod ?? ''}`}
          className="text-sm"
          style={{ color: 'var(--ink)' }}
        >
          <span className="font-medium">{dc.category}</span>
          {dc.description && <span style={{ color: 'var(--ink-2)' }}> - {dc.description}</span>}
          {dc.retentionPeriod && (
            <span className="ml-1" style={{ color: 'var(--ink-3)' }}>
              ({dc.retentionPeriod})
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function renderRecipients(treatment: TreatmentDto, locale: string): React.ReactNode {
  if (Array.isArray(treatment.recipients) && treatment.recipients.length > 0) {
    return (
      <ul className="mt-1 space-y-1">
        {treatment.recipients.map(r => (
          <li
            key={`${r.type}-${r.precision ?? ''}`}
            className="text-sm"
            style={{ color: 'var(--ink)' }}
          >
            <span className="font-medium">{resolveLabel(RECIPIENT_TYPES, r.type, locale)}</span>
            {r.precision && <span style={{ color: 'var(--ink-2)' }}> - {r.precision}</span>}
          </li>
        ))}
      </ul>
    );
  }
  if (treatment.recipientTypes.length > 0) {
    return (
      <ul className="mt-1 space-y-0.5">
        {treatment.recipientTypes.map(r => (
          <li key={r} className="text-sm" style={{ color: 'var(--ink)' }}>
            {resolveLabel(RECIPIENT_TYPES, r, locale)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
      {EM_DASH}
    </p>
  );
}

function renderTransfers(treatment: TreatmentDto, t: (key: string) => string): React.ReactNode {
  if (!Array.isArray(treatment.transfers) || treatment.transfers.length === 0) {
    return (
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
        {EM_DASH}
      </p>
    );
  }
  return (
    <ul className="mt-1 space-y-2">
      {treatment.transfers.map(tf => (
        <li
          key={`${tf.destinationOrg}-${tf.country}`}
          className="rounded border p-2 text-sm"
          style={{ borderColor: 'var(--a30-border)', background: 'var(--surface-2)' }}
        >
          <div className="font-medium" style={{ color: 'var(--ink)' }}>
            {tf.destinationOrg}
          </div>
          <div style={{ color: 'var(--ink-2)' }}>{tf.country}</div>
          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {t(`guaranteeType.${tf.guaranteeType}`)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function renderSecurity(treatment: TreatmentDto, locale: string): React.ReactNode {
  if (
    Array.isArray(treatment.securityMeasuresDetailed) &&
    treatment.securityMeasuresDetailed.length > 0
  ) {
    return (
      <ul className="mt-1 space-y-1">
        {treatment.securityMeasuresDetailed.map(sm => (
          <li
            key={`${sm.type}-${sm.precision ?? ''}`}
            className="text-sm"
            style={{ color: 'var(--ink)' }}
          >
            <span className="font-medium">{resolveLabel(SECURITY_MEASURES, sm.type, locale)}</span>
            {sm.precision && <span style={{ color: 'var(--ink-2)' }}> - {sm.precision}</span>}
          </li>
        ))}
      </ul>
    );
  }
  if (treatment.securityMeasures.length > 0) {
    return (
      <ul className="mt-1 space-y-0.5">
        {treatment.securityMeasures.map(s => (
          <li key={s} className="text-sm" style={{ color: 'var(--ink)' }}>
            {resolveLabel(SECURITY_MEASURES, s, locale)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
      {EM_DASH}
    </p>
  );
}

function AipdWarning({ t }: Readonly<{ t: (key: string) => string }>) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 size-5 flex-shrink-0 text-red-600"
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
          <h3 className="font-semibold text-red-800">{t('aipd.required')}</h3>
          <p className="mt-1 text-sm text-red-700">{t('aipd.warning')}</p>
        </div>
      </div>
    </div>
  );
}

type TreatmentHeaderCardProps = Readonly<{
  treatment: TreatmentDto;
  refDisplay: string;
  statusBadge: React.ReactNode;
  indicators: NonNullable<TreatmentDto['indicators']>;
  t: (key: string) => string;
}>;

function TreatmentHeaderCard({
  treatment,
  refDisplay,
  statusBadge,
  indicators,
  t,
}: TreatmentHeaderCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm" style={{ color: 'var(--ink-3)' }}>
                {refDisplay}
              </span>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
                {treatment.name}
              </h2>
              {statusBadge}
            </div>
            {treatment.validatedBy && (
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-3)' }}>
                {t('register.validatedBy')}:{' '}
                {treatment.validator
                  ? `${treatment.validator.firstName} ${treatment.validator.lastName}`
                  : treatment.validatedBy}
                {treatment.validatedAt && <> &mdash; {formatDate(treatment.validatedAt)}</>}
              </p>
            )}
            {treatment.lastReviewedAt && (
              <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                {t('register.lastReviewedAt')}: {formatDate(treatment.lastReviewedAt)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CompletenessBadge score={indicators.completenessScore} />
            <RiskBadge
              riskLevel={indicators.riskLevel}
              criteriaCount={indicators.riskCriteriaCount}
            />
            <FreshnessBadge
              freshnessStatus={indicators.freshnessStatus}
              nextReviewAt={treatment.nextReviewAt}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type TreatmentActionButtonsProps = Readonly<{
  treatment: TreatmentDto;
  canWrite: boolean;
  canDelete: boolean;
  canValidate: boolean;
  canExport: boolean;
  isOwnTreatment: boolean;
  validateTooltipForOwn: string | undefined;
  onMarkAsReviewed: () => void;
  onExportPdf: () => void;
  onPreviewPdf: () => void;
  onEdit: () => void;
  onValidate: () => void;
  onInvalidate: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}>;

function TreatmentActionButtons({
  treatment,
  canWrite,
  canDelete,
  canValidate,
  canExport,
  isOwnTreatment,
  validateTooltipForOwn,
  onMarkAsReviewed,
  onExportPdf,
  onPreviewPdf,
  onEdit,
  onValidate,
  onInvalidate,
  onDelete,
  t,
}: TreatmentActionButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canValidate && (
        <Button variant="outline" size="sm" onClick={onMarkAsReviewed}>
          {t('register.markAsReviewed')}
        </Button>
      )}
      {canExport && (
        <>
          <Button variant="outline" size="sm" onClick={onPreviewPdf}>
            {t('register.previewPdf')}
          </Button>
          <Button variant="outline" size="sm" onClick={onExportPdf}>
            {t('register.exportPdf')}
          </Button>
        </>
      )}
      {canWrite && (
        <Button size="sm" onClick={onEdit}>
          {t('common.edit')}
        </Button>
      )}
      {canValidate && treatment.status === TreatmentStatus.DRAFT && (
        <ValidateButtonWithTooltip blocked={isOwnTreatment} reason={validateTooltipForOwn}>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={onValidate}
            disabled={isOwnTreatment}
          >
            {t('treatment.validate')}
          </Button>
        </ValidateButtonWithTooltip>
      )}
      {canValidate && treatment.status === TreatmentStatus.VALIDATED && (
        <ValidateButtonWithTooltip blocked={isOwnTreatment} reason={validateTooltipForOwn}>
          <Button variant="outline" size="sm" onClick={onInvalidate} disabled={isOwnTreatment}>
            {t('treatment.invalidate')}
          </Button>
        </ValidateButtonWithTooltip>
      )}
      {canDelete && (
        <Button variant="destructive" size="sm" onClick={onDelete}>
          {t('common.delete')}
        </Button>
      )}
    </div>
  );
}

function ValidateButtonWithTooltip({
  blocked,
  reason,
  children,
}: Readonly<{ blocked: boolean; reason: string | undefined; children: React.ReactNode }>) {
  if (!blocked || !reason) {
    return <>{children}</>;
  }
  // Wrap in a span so the Tooltip trigger can attach hover/focus events even
  // though the inner Button is disabled (browsers swallow events on disabled
  // form controls).
  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={5}
          className="max-w-xs p-3"
          style={{ background: 'var(--ink)', color: 'var(--surface)' }}
        >
          <p className="text-xs leading-relaxed">{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function buildIndicators(treatment: TreatmentDto): NonNullable<TreatmentDto['indicators']> {
  return (
    treatment.indicators ?? {
      completenessScore: DEFAULT_COMPLETENESS_SCORE,
      riskLevel: RiskLevel.LOW,
      riskCriteriaCount: DEFAULT_RISK_CRITERIA_COUNT,
      freshnessStatus: FreshnessStatus.FRESH,
      aipdRequired: false,
    }
  );
}

function buildRefDisplay(refNumber: number | null | undefined): string {
  if (refNumber) {
    return `T-${String(refNumber).padStart(REF_NUMBER_PAD_LENGTH, '0')}`;
  }
  return EM_DASH;
}

type StatusBadgeProps = Readonly<{
  status: TreatmentStatus;
  t: (key: string) => string;
}>;

function StatusBadge({ status, t }: StatusBadgeProps) {
  if (status === TreatmentStatus.VALIDATED) {
    return <Badge className="bg-green-100 text-green-800">{t('common.validated')}</Badge>;
  }
  return <Badge className="bg-amber-100 text-amber-800">{t('common.draft')}</Badge>;
}

type AipdBadgeProps = Readonly<{
  required: boolean;
  t: (key: string) => string;
}>;

function AipdBadge({ required, t }: AipdBadgeProps) {
  if (required) {
    return <Badge className="bg-red-100 text-red-800">{t('aipd.required')}</Badge>;
  }
  return <Badge className="bg-green-100 text-green-800">{t('aipd.notRequired')}</Badge>;
}

type IdentificationCardProps = Readonly<{
  treatment: TreatmentDto;
  legalBasisNode: React.ReactNode;
  t: (key: string) => string;
}>;

function IdentificationCard({ treatment, legalBasisNode, t }: IdentificationCardProps) {
  const subPurposes = treatment.subPurposes ?? [];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('wizard.step.identification')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('treatment.purpose')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {treatment.purpose || EM_DASH}
          </p>
          {subPurposes.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-sm" style={{ color: 'var(--ink-2)' }}>
              {subPurposes.map(sp => (
                <li key={sp}>{sp}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('treatment.legalBasis')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {legalBasisNode}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

type DataCardProps = Readonly<{
  treatment: TreatmentDto;
  personCategoriesNode: React.ReactNode;
  dataCategoriesNode: React.ReactNode;
  t: (key: string) => string;
}>;

function DataCard({ treatment, personCategoriesNode, dataCategoriesNode, t }: DataCardProps) {
  const showSensitive = treatment.hasSensitiveData && treatment.sensitiveCategories.length > 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('wizard.step.data')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('treatment.personCategories')}
          </p>
          <ul className="mt-1 space-y-0.5">{personCategoriesNode}</ul>
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('treatment.dataCategories')}
          </p>
          {dataCategoriesNode}
        </div>
        {showSensitive && (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-red-600">{t('treatment.sensitiveCategories')}</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {treatment.sensitiveCategories.map(sc => (
                <Badge key={sc} variant="outline" className="border-red-200 bg-red-50 text-red-700">
                  {t(`sensitiveCategory.${sc}`)}
                </Badge>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type RecipientsCardProps = Readonly<{
  recipientsNode: React.ReactNode;
  transfersNode: React.ReactNode;
  t: (key: string) => string;
}>;

function RecipientsCard({ recipientsNode, transfersNode, t }: RecipientsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('wizard.step.recipients')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('treatment.recipientTypes')}
          </p>
          {recipientsNode}
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('treatment.transfers')}
          </p>
          {transfersNode}
        </div>
      </CardContent>
    </Card>
  );
}

type SecurityCardProps = Readonly<{
  treatment: TreatmentDto;
  securityNode: React.ReactNode;
  t: (key: string) => string;
}>;

function SecurityCard({ treatment, securityNode, t }: SecurityCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('wizard.step.security')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('treatment.retentionPeriod')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {treatment.retentionPeriod || EM_DASH}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('treatment.securityMeasures')}
          </p>
          {securityNode}
        </div>
      </CardContent>
    </Card>
  );
}

type RiskAssessmentCardProps = Readonly<{
  indicators: NonNullable<TreatmentDto['indicators']>;
  riskCriteriaItems: ReadonlyArray<{ key: string; label: string; value: boolean }>;
  aipdBadge: React.ReactNode;
  t: (key: string) => string;
}>;

function RiskAssessmentCard({
  indicators,
  riskCriteriaItems,
  aipdBadge,
  t,
}: RiskAssessmentCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('wizard.step.riskAssessment')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4">
          <div className="text-sm">
            <span className="font-medium" style={{ color: 'var(--ink-2)' }}>
              {t('aipd.criteriaCount')}:{' '}
            </span>
            <span className="font-semibold">
              {indicators.riskCriteriaCount}/{RISK_CRITERIA_TOTAL}
            </span>
          </div>
          {aipdBadge}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {riskCriteriaItems.map(({ key, label, value }) => (
            <RiskCriterionCard key={key} label={label} value={value} t={t} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type CreatedMetaCardProps = Readonly<{
  treatment: TreatmentDto;
  t: (key: string) => string;
}>;

function CreatedMetaCard({ treatment, t }: CreatedMetaCardProps) {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('common.createdBy')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {treatment.creator
              ? `${treatment.creator.firstName} ${treatment.creator.lastName}`
              : treatment.createdBy}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('common.createdAt')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {formatDate(treatment.createdAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TreatmentDetailPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { user } = useCurrentUser();
  const {
    data: treatment,
    loading,
    setData: setTreatment,
  } = useFetch<TreatmentDto>(`/treatments/${id}`);
  const { data: org } = useFetch<OrganizationDto>('/organization');
  const enforceSeparation = org?.enforceSeparationOfDuties ?? true;
  const [previewOpen, setPreviewOpen] = useState(false);
  const canWrite = user && (WRITE_ROLES as readonly Role[]).includes(user.role);
  const canDelete = user && (DELETE_ROLES as readonly Role[]).includes(user.role);
  const canValidate = user && (VALIDATE_ROLES as readonly Role[]).includes(user.role);
  const canExport = user && (EXPORT_ROLES as readonly Role[]).includes(user.role);

  const handleBack = useCallback(() => {
    router.push('/register');
  }, [router]);

  const handleEdit = useCallback(() => {
    router.push(`/register/${id}/edit`);
  }, [router, id]);

  const handleValidate = useCallback(async () => {
    try {
      const res = await api.patch<TreatmentDto>(`/treatments/${id}/validate`);
      setTreatment(res);
    } catch {}
  }, [id, setTreatment]);

  const handleInvalidate = useCallback(async () => {
    try {
      const res = await api.patch<TreatmentDto>(`/treatments/${id}/invalidate`);
      setTreatment(res);
    } catch {}
  }, [id, setTreatment]);

  const handleMarkAsReviewed = useCallback(async () => {
    try {
      const res = await api.patch<TreatmentDto>(`/treatments/${id}/mark-reviewed`);
      setTreatment(res);
    } catch {}
  }, [id, setTreatment]);

  const handlePreviewPdf = useCallback(() => setPreviewOpen(true), []);

  const handleExportPdf = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
      const res = await fetch(`${apiUrl}/api/treatments/${id}/export-pdf?locale=${locale}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Export failed');
      }
      const blob = await res.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `treatment-${treatment?.refNumber ?? id}.pdf`;
      a.click();
      globalThis.URL.revokeObjectURL(url);
    } catch {}
  }, [id, treatment, locale]);

  const handleDelete = useCallback(async () => {
    if (!confirm(t('common.confirmDelete'))) {
      return;
    }
    try {
      await api.delete(`/treatments/${id}`);
      router.push('/register');
    } catch {}
  }, [t, id, router]);

  if (loading) {
    return (
      <div className="mt-8 flex justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-[var(--a30-border)] border-t-indigo-600" />
      </div>
    );
  }

  if (!treatment) {
    return (
      <p className="mt-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
        {t(NO_RESULTS_KEY)}
      </p>
    );
  }

  const indicators = buildIndicators(treatment);
  const refDisplay = buildRefDisplay(treatment.refNumber);

  const riskCriteriaItems = RISK_CRITERIA_KEYS.map(({ key, label }) => ({
    key,
    label,
    value: (treatment as unknown as Record<string, unknown>)[key] as boolean,
  }));

  const statusBadge = <StatusBadge status={treatment.status} t={t} />;

  let legalBasisNode: React.ReactNode = EM_DASH;
  if (treatment.legalBasis) {
    legalBasisNode = t(`legalBasis.${treatment.legalBasis}`);
  }

  const personCategoriesNode = renderPersonCategories(treatment, locale);
  const dataCategoriesNode = renderDataCategories(treatment);
  const recipientsNode = renderRecipients(treatment, locale);
  const transfersNode = renderTransfers(treatment, t);
  const securityNode = renderSecurity(treatment, locale);

  const aipdBadge = <AipdBadge required={indicators.aipdRequired} t={t} />;

  const isOwnTreatmentBlocked = enforceSeparation && treatment.createdBy === user?.id;
  let validateTooltipForOwn: string | undefined;
  if (isOwnTreatmentBlocked) {
    validateTooltipForOwn = t('treatment.cannotValidateOwn');
  }

  return (
    <>
      {/* Back button — Topbar in layout shell handles the page title */}
      <div className="mb-4 flex items-center">
        <Button variant="outline" size="sm" onClick={handleBack}>
          {t('common.back')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left rail: Article 30 checklist + audit metadata */}
        <div className="space-y-4">
          <Article30Checklist treatment={treatment} />
          <CreatedMetaCard treatment={treatment} t={t} />
        </div>

        {/* Right pane: action strip + all content sections */}
        <div className="space-y-6">
          {/* AIPD warning */}
          {indicators.aipdRequired && <AipdWarning t={t} />}

          {/* Header: ref, name, status badge, freshness/completeness/risk indicators */}
          <TreatmentHeaderCard
            treatment={treatment}
            refDisplay={refDisplay}
            statusBadge={statusBadge}
            indicators={indicators}
            t={t}
          />

          {/* Action strip: edit / validate / delete / export / mark-reviewed */}
          <TreatmentActionButtons
            treatment={treatment}
            canWrite={Boolean(canWrite)}
            canDelete={Boolean(canDelete)}
            canValidate={Boolean(canValidate)}
            canExport={Boolean(canExport)}
            isOwnTreatment={isOwnTreatmentBlocked}
            validateTooltipForOwn={validateTooltipForOwn}
            onMarkAsReviewed={handleMarkAsReviewed}
            onExportPdf={handleExportPdf}
            onPreviewPdf={handlePreviewPdf}
            onEdit={handleEdit}
            onValidate={handleValidate}
            onInvalidate={handleInvalidate}
            onDelete={handleDelete}
            t={t}
          />

          {/* Main content cards */}
          <IdentificationCard treatment={treatment} legalBasisNode={legalBasisNode} t={t} />
          <DataCard
            treatment={treatment}
            personCategoriesNode={personCategoriesNode}
            dataCategoriesNode={dataCategoriesNode}
            t={t}
          />
          <RecipientsCard recipientsNode={recipientsNode} transfersNode={transfersNode} t={t} />
          <SecurityCard treatment={treatment} securityNode={securityNode} t={t} />
          <RiskAssessmentCard
            indicators={indicators}
            riskCriteriaItems={riskCriteriaItems}
            aipdBadge={aipdBadge}
            t={t}
          />
          <DocumentList linkedEntity="TREATMENT" linkedEntityId={id} />
        </div>
      </div>

      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        url={`/api/treatments/${id}/export-pdf?locale=${locale}`}
        title={t('pdfPreview.title.treatment')}
        downloadName={`treatment-${treatment.refNumber ?? id}.pdf`}
      />
    </>
  );
}
