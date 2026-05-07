'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { formatDate as formatDateGlobal } from '@/lib/dates';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useFetch } from '@/lib/hooks/use-fetch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DpaTooltip } from '@/components/domain/dpa-tooltip';
import { PdfPreviewDialog } from '@/components/domain/pdf-preview-dialog';
import {
  DpaStatus,
  Role,
  WRITE_ROLES,
  DELETE_ROLES,
  VALIDATE_ROLES,
  VENDOR_ASSESSMENT_QUESTIONS,
  VendorAssessmentStatus,
} from '@article30/shared';
import type { VendorDto, VendorAssessmentDto } from '@article30/shared';

const SCORE_GREEN_THRESHOLD = 70;
const SCORE_AMBER_THRESHOLD = 40;
const EM_DASH = '—';
const NO_RESULTS_KEY = 'common.noResults';
const APPROVED_CLASS = 'bg-green-100 text-green-800';
const REJECTED_CLASS = 'bg-red-100 text-red-800';
const AMBER_CLASS = 'bg-amber-100 text-amber-800';
const BLUE_CLASS = 'bg-blue-100 text-blue-800';
const REVIEW_STATUS_APPROVED = 'APPROVED';
const REVIEW_STATUS_REJECTED = 'REJECTED';

const ANSWER_OPTIONS = ['YES', 'PARTIAL', 'NO', 'NA'] as const;
type AnswerOption = (typeof ANSWER_OPTIONS)[number];

function getAssessmentStatusClass(status: VendorAssessmentStatus): string {
  if (status === VendorAssessmentStatus.APPROVED) {
    return APPROVED_CLASS;
  }
  if (status === VendorAssessmentStatus.REJECTED) {
    return REJECTED_CLASS;
  }
  if (status === VendorAssessmentStatus.SUBMITTED) {
    return BLUE_CLASS;
  }
  return AMBER_CLASS;
}

function getScoreBadgeClass(score: number): string {
  if (score >= SCORE_GREEN_THRESHOLD) {
    return APPROVED_CLASS;
  }
  if (score >= SCORE_AMBER_THRESHOLD) {
    return AMBER_CLASS;
  }
  return REJECTED_CLASS;
}

const DPA_STATUS_COLORS: Record<DpaStatus, string> = {
  [DpaStatus.MISSING]: REJECTED_CLASS,
  [DpaStatus.DRAFT]: AMBER_CLASS,
  [DpaStatus.SENT]: BLUE_CLASS,
  [DpaStatus.SIGNED]: APPROVED_CLASS,
  [DpaStatus.EXPIRED]: REJECTED_CLASS,
};

const EDITABLE_ASSESSMENT_STATUSES: ReadonlySet<VendorAssessmentStatus> =
  new Set<VendorAssessmentStatus>([
    VendorAssessmentStatus.PENDING,
    VendorAssessmentStatus.IN_PROGRESS,
  ]);

const READONLY_ASSESSMENT_STATUSES: ReadonlySet<VendorAssessmentStatus> =
  new Set<VendorAssessmentStatus>([
    VendorAssessmentStatus.SUBMITTED,
    VendorAssessmentStatus.APPROVED,
    VendorAssessmentStatus.REJECTED,
  ]);

interface VendorDetail {
  id: string;
  name: string;
  description: string | null;
  contactName: string | null;
  contactEmail: string | null;
  country: string | null;
  dpaStatus: DpaStatus;
  dpaSigned: string | null;
  dpaExpiry: string | null;
  dpaDocumentId: string | null;
  isSubProcessor: boolean;
  parentVendorId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; firstName: string; lastName: string };
  treatments: { vendorId: string; treatmentId: string; treatment: { id: string; name: string } }[];
  subProcessors: VendorDto[];
}

type AnswerEntry = { answer: string; notes: string };

function formatDate(value: string | null): string {
  return formatDateGlobal(value) || EM_DASH;
}

function pickLocalizedLabel(label: { fr: string; en: string }, locale: string): string {
  if (locale === 'fr') {
    return label.fr;
  }
  return label.en;
}

type QuestionEditProps = Readonly<{
  question: (typeof VENDOR_ASSESSMENT_QUESTIONS)[number];
  locale: string;
  t: (key: string) => string;
  entry: AnswerEntry | undefined;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, AnswerEntry>>>;
}>;

function QuestionEdit({ question, locale, t, entry, setAnswers }: QuestionEditProps) {
  const handleAnswerChange = useCallback(
    (opt: AnswerOption) => {
      setAnswers(prev => ({
        ...prev,
        [question.id]: {
          ...prev[question.id],
          answer: opt,
          notes: prev[question.id]?.notes ?? '',
        },
      }));
    },
    [question.id, setAnswers],
  );

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setAnswers(prev => ({
        ...prev,
        [question.id]: {
          ...prev[question.id],
          answer: prev[question.id]?.answer ?? '',
          notes: value,
        },
      }));
    },
    [question.id, setAnswers],
  );

  const label = pickLocalizedLabel(question.label, locale);

  return (
    <div className="rounded border p-3" style={{ borderColor: 'var(--a30-border)' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {ANSWER_OPTIONS.map(opt => (
          <AnswerRadio
            key={opt}
            option={opt}
            questionId={question.id}
            checked={entry?.answer === opt}
            label={t(`assessment.answer.${opt}`)}
            onSelect={handleAnswerChange}
          />
        ))}
      </div>
      <textarea
        className="mt-2 w-full rounded-md border p-2 text-xs"
        style={{ borderColor: 'var(--a30-border)' }}
        rows={1}
        placeholder="Notes..."
        value={entry?.notes ?? ''}
        onChange={handleNotesChange}
      />
    </div>
  );
}

type AnswerRadioProps = Readonly<{
  option: AnswerOption;
  questionId: string;
  checked: boolean;
  label: string;
  onSelect: (opt: AnswerOption) => void;
}>;

function AnswerRadio({ option, questionId, checked, label, onSelect }: AnswerRadioProps) {
  const handleChange = useCallback(() => {
    onSelect(option);
  }, [option, onSelect]);

  return (
    <label className="flex items-center gap-1.5 text-sm">
      <input
        type="radio"
        name={questionId}
        checked={checked}
        onChange={handleChange}
        style={{ accentColor: 'var(--primary-600)' }}
      />
      {label}
    </label>
  );
}

type AssessmentSectionProps = Readonly<{
  assessment: VendorAssessmentDto;
  assessmentAnswers: Record<string, AnswerEntry>;
  setAssessmentAnswers: React.Dispatch<React.SetStateAction<Record<string, AnswerEntry>>>;
  isEditableAssessment: boolean;
  isReadOnlyAssessment: boolean;
  canWrite: boolean;
  canValidate: boolean;
  reviewNotes: string;
  onReviewNotesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSaveAssessment: () => void;
  onSubmitAssessment: () => void;
  onApprove: () => void;
  onReject: () => void;
  locale: string;
  t: (key: string) => string;
}>;

function AssessmentReadOnly({
  assessmentAnswers,
  locale,
  t,
}: Readonly<{
  assessmentAnswers: Record<string, AnswerEntry>;
  locale: string;
  t: (key: string) => string;
}>) {
  return (
    <div className="space-y-3">
      {VENDOR_ASSESSMENT_QUESTIONS.map(q => {
        const a = assessmentAnswers[q.id];
        const label = pickLocalizedLabel(q.label, locale);
        let answerText = EM_DASH;
        if (a?.answer) {
          answerText = t(`assessment.answer.${a.answer}`);
        }
        return (
          <div
            key={q.id}
            className="rounded border p-3"
            style={{ borderColor: 'var(--a30-border)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
              {label}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
              {answerText}
              {a?.notes && (
                <span className="ml-2" style={{ color: 'var(--ink-3)' }}>
                  ({a.notes})
                </span>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function AssessmentReview({
  reviewNotes,
  onReviewNotesChange,
  onApprove,
  onReject,
  t,
}: Readonly<{
  reviewNotes: string;
  onReviewNotesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onApprove: () => void;
  onReject: () => void;
  t: (key: string) => string;
}>) {
  return (
    <div
      className="mt-4 space-y-3 rounded border p-4"
      style={{ borderColor: 'var(--a30-border)', background: 'var(--surface-2)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
        {t('assessment.review')}
      </p>
      <textarea
        className="w-full rounded-md border p-2 text-sm"
        style={{ borderColor: 'var(--a30-border)' }}
        rows={3}
        placeholder={t('assessment.reviewNotes')}
        value={reviewNotes}
        onChange={onReviewNotesChange}
      />
      <div className="flex gap-2">
        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onApprove}>
          {t('assessment.approve')}
        </Button>
        <Button variant="destructive" size="sm" onClick={onReject}>
          {t('assessment.reject')}
        </Button>
      </div>
    </div>
  );
}

function AssessmentSection({
  assessment,
  assessmentAnswers,
  setAssessmentAnswers,
  isEditableAssessment,
  isReadOnlyAssessment,
  canWrite,
  canValidate,
  reviewNotes,
  onReviewNotesChange,
  onSaveAssessment,
  onSubmitAssessment,
  onApprove,
  onReject,
  locale,
  t,
}: AssessmentSectionProps) {
  return (
    <div className="mt-3 space-y-4">
      <div className="flex items-center gap-3">
        <Badge className={getAssessmentStatusClass(assessment.status)}>
          {t(`assessment.status.${assessment.status}`)}
        </Badge>
        {assessment.score !== null && assessment.score !== undefined && (
          <Badge className={getScoreBadgeClass(assessment.score)}>
            {t('assessment.score')}: {assessment.score}%
          </Badge>
        )}
      </div>

      {isEditableAssessment && canWrite && (
        <div className="space-y-4">
          {VENDOR_ASSESSMENT_QUESTIONS.map(q => (
            <QuestionEdit
              key={q.id}
              question={q}
              locale={locale}
              t={t}
              entry={assessmentAnswers[q.id]}
              setAnswers={setAssessmentAnswers}
            />
          ))}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onSaveAssessment}>
              {t('common.save')}
            </Button>
            <Button size="sm" onClick={onSubmitAssessment}>
              {t('assessment.submit')}
            </Button>
          </div>
        </div>
      )}

      {isReadOnlyAssessment && (
        <AssessmentReadOnly assessmentAnswers={assessmentAnswers} locale={locale} t={t} />
      )}

      {assessment.status === VendorAssessmentStatus.SUBMITTED && canValidate && (
        <AssessmentReview
          reviewNotes={reviewNotes}
          onReviewNotesChange={onReviewNotesChange}
          onApprove={onApprove}
          onReject={onReject}
          t={t}
        />
      )}

      {assessment.reviewNotes && (
        <div
          className="rounded border p-3"
          style={{ borderColor: 'var(--a30-border)', background: 'var(--surface-2)' }}
        >
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('assessment.reviewNotes')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {assessment.reviewNotes}
          </p>
        </div>
      )}
    </div>
  );
}

type HeaderActionsProps = Readonly<{
  canWrite: boolean;
  canDelete: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}>;

function HeaderActions({ canWrite, canDelete, onBack, onEdit, onDelete, t }: HeaderActionsProps) {
  return (
    <>
      <Button variant="outline" size="sm" onClick={onBack}>
        {t('common.back')}
      </Button>
      {canWrite && (
        <Button size="sm" onClick={onEdit}>
          {t('common.edit')}
        </Button>
      )}
      {canDelete && (
        <Button variant="destructive" size="sm" onClick={onDelete}>
          {t('vendor.delete')}
        </Button>
      )}
    </>
  );
}

type VendorInfoCardProps = Readonly<{
  vendor: VendorDetail;
  t: (key: string) => string;
}>;

function VendorInfoCard({ vendor, t }: VendorInfoCardProps) {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('vendor.name')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {vendor.name}
          </p>
        </div>
        {vendor.description && (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
              {t('vendor.description')}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
              {vendor.description}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('vendor.contactName')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {vendor.contactName ?? EM_DASH}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('vendor.contactEmail')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {vendor.contactEmail ?? EM_DASH}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('vendor.country')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {vendor.country ?? EM_DASH}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

type DpaCardProps = Readonly<{
  vendor: VendorDetail;
  t: (key: string) => string;
}>;

function DpaCard({ vendor, t }: DpaCardProps) {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-0 sm:grid-cols-3">
        <div>
          <p
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: 'var(--ink-3)' }}
          >
            {t('vendor.dpaStatus')}
            <DpaTooltip />
          </p>
          <div className="mt-1">
            <Badge className={DPA_STATUS_COLORS[vendor.dpaStatus]}>
              {t(`vendor.dpaStatus.${vendor.dpaStatus}`)}
            </Badge>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('vendor.dpaSigned')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {formatDate(vendor.dpaSigned)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('vendor.dpaExpiry')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {formatDate(vendor.dpaExpiry)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

type SubProcessorCardProps = Readonly<{
  vendor: VendorDetail;
  t: (key: string) => string;
}>;

function SubProcessorCard({ vendor, t }: SubProcessorCardProps) {
  if (!vendor.isSubProcessor) {
    return null;
  }
  let linkNode: React.ReactNode;
  if (vendor.parentVendorId) {
    linkNode = (
      <Link
        href={`/vendors/${vendor.parentVendorId}`}
        className="hover:underline"
        style={{ color: 'var(--primary)' }}
      >
        {t('vendor.parentVendor')}
      </Link>
    );
  } else {
    linkNode = t('common.yes');
  }
  return (
    <Card>
      <CardContent className="pt-0">
        <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
          {t('vendor.isSubProcessor')}
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
          {linkNode}
        </p>
      </CardContent>
    </Card>
  );
}

type TreatmentsCardProps = Readonly<{
  vendor: VendorDetail;
  t: (key: string) => string;
}>;

function TreatmentsCard({ vendor, t }: TreatmentsCardProps) {
  let body: React.ReactNode;
  if (vendor.treatments.length > 0) {
    body = (
      <div className="mt-2 flex flex-wrap gap-2">
        {vendor.treatments.map(link => (
          <Link
            key={link.treatmentId}
            href={`/register/${link.treatmentId}`}
            className="rounded-md px-3 py-1 text-sm hover:underline"
            style={{ background: 'var(--primary-50)', color: 'var(--primary)' }}
          >
            {link.treatment.name}
          </Link>
        ))}
      </div>
    );
  } else {
    body = (
      <p className="mt-2 text-xs" style={{ color: 'var(--ink-3)' }}>
        {t(NO_RESULTS_KEY)}
      </p>
    );
  }
  return (
    <Card>
      <CardContent className="pt-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          {t('vendor.treatments')}
        </p>
        {body}
      </CardContent>
    </Card>
  );
}

type SubProcessorsCardProps = Readonly<{
  vendor: VendorDetail;
  t: (key: string) => string;
}>;

function SubProcessorsCard({ vendor, t }: SubProcessorsCardProps) {
  if (vendor.subProcessors.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardContent className="pt-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          {t('vendor.subProcessors')}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {vendor.subProcessors.map(sub => (
            <Link
              key={sub.id}
              href={`/vendors/${sub.id}`}
              className="rounded-md px-3 py-1 text-sm hover:underline"
              style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}
            >
              {sub.name}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type AssessmentCardProps = Readonly<{
  vendorId: string;
  assessment: VendorAssessmentDto | null;
  assessmentAnswers: Record<string, AnswerEntry>;
  setAssessmentAnswers: React.Dispatch<React.SetStateAction<Record<string, AnswerEntry>>>;
  canWrite: boolean;
  canValidate: boolean;
  reviewNotes: string;
  onReviewNotesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onStartAssessment: () => void;
  onSaveAssessment: () => void;
  onSubmitAssessment: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPreviewQuestionnaire: () => void;
  locale: string;
  t: (key: string) => string;
}>;

function AssessmentCard({
  vendorId,
  assessment,
  assessmentAnswers,
  setAssessmentAnswers,
  canWrite,
  canValidate,
  reviewNotes,
  onReviewNotesChange,
  onStartAssessment,
  onSaveAssessment,
  onSubmitAssessment,
  onApprove,
  onReject,
  onPreviewQuestionnaire,
  locale,
  t,
}: AssessmentCardProps) {
  let body: React.ReactNode;
  if (assessment) {
    const isEditableAssessment = EDITABLE_ASSESSMENT_STATUSES.has(assessment.status);
    const isReadOnlyAssessment = READONLY_ASSESSMENT_STATUSES.has(assessment.status);
    body = (
      <AssessmentSection
        assessment={assessment}
        assessmentAnswers={assessmentAnswers}
        setAssessmentAnswers={setAssessmentAnswers}
        isEditableAssessment={isEditableAssessment}
        isReadOnlyAssessment={isReadOnlyAssessment}
        canWrite={canWrite}
        canValidate={canValidate}
        reviewNotes={reviewNotes}
        onReviewNotesChange={onReviewNotesChange}
        onSaveAssessment={onSaveAssessment}
        onSubmitAssessment={onSubmitAssessment}
        onApprove={onApprove}
        onReject={onReject}
        locale={locale}
        t={t}
      />
    );
  } else {
    body = (
      <div className="mt-3">
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          {t(NO_RESULTS_KEY)}
        </p>
        {canWrite && (
          <Button size="sm" className="mt-2" onClick={onStartAssessment}>
            {t('assessment.start')}
          </Button>
        )}
      </div>
    );
  }
  return (
    <Card>
      <CardContent className="pt-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {t('assessment.title')}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onPreviewQuestionnaire}
              className="text-xs font-medium hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              {t('register.previewPdf')}
            </button>
            <a
              href={`/api/vendors/${vendorId}/questionnaire`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              {t('assessment.downloadQuestionnaire')}
            </a>
          </div>
        </div>
        {body}
      </CardContent>
    </Card>
  );
}

type AuditCardProps = Readonly<{
  vendor: VendorDetail;
  t: (key: string) => string;
}>;

function AuditCard({ vendor, t }: AuditCardProps) {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('common.createdBy')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {`${vendor.creator.firstName} ${vendor.creator.lastName}`}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('common.createdAt')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {formatDate(vendor.createdAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingView() {
  return (
    <div className="mt-8 flex justify-center">
      <div
        className="size-8 animate-spin rounded-full border-4"
        style={{ borderColor: 'var(--a30-border)', borderTopColor: 'var(--primary)' }}
      />
    </div>
  );
}

export default function VendorDetailPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { user } = useCurrentUser();
  const { data: vendor, loading } = useFetch<VendorDetail>(`/vendors/${id}`);
  const { data: assessment, setData: setAssessment } = useFetch<VendorAssessmentDto | null>(
    `/vendors/${id}/assessment`,
  );
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, AnswerEntry>>({});
  const [reviewNotes, setReviewNotes] = useState('');
  const [questionnairePreviewOpen, setQuestionnairePreviewOpen] = useState(false);

  const canWrite = Boolean(user && (WRITE_ROLES as readonly Role[]).includes(user.role));
  const canDelete = Boolean(user && (DELETE_ROLES as readonly Role[]).includes(user.role));
  const canValidate = Boolean(user && (VALIDATE_ROLES as readonly Role[]).includes(user.role));

  // Seed the local form-state from the populated assessment answers once it
  // arrives. Watching `assessment` instead of refetching keeps this isolated
  // from the data layer.
  useEffect(() => {
    if (!assessment?.answers || !Array.isArray(assessment.answers)) {
      return;
    }
    const map: Record<string, AnswerEntry> = {};
    const answers = assessment.answers as {
      questionId: string;
      answer: string;
      notes?: string;
    }[];
    for (const a of answers) {
      map[a.questionId] = { answer: a.answer, notes: a.notes ?? '' };
    }
    setAssessmentAnswers(map);
  }, [assessment]);

  const handleBack = useCallback(() => {
    router.push('/vendors');
  }, [router]);

  const handleEdit = useCallback(() => {
    router.push(`/vendors/${id}/edit`);
  }, [router, id]);

  const handleReviewNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReviewNotes(e.target.value);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!confirm(t('vendor.confirmDelete'))) {
      return;
    }
    try {
      await api.delete(`/vendors/${id}`);
      router.push('/vendors');
    } catch {
      // handled by api client
    }
  }, [t, id, router]);

  const handleStartAssessment = useCallback(async () => {
    try {
      const res = await api.post<VendorAssessmentDto>(`/vendors/${id}/assessment`);
      setAssessment(res);
    } catch {
      // handled by api client
    }
  }, [id, setAssessment]);

  const handleSaveAssessment = useCallback(async () => {
    if (!assessment) {
      return;
    }
    const answers = Object.entries(assessmentAnswers).map(([questionId, { answer, notes }]) => ({
      questionId,
      answer,
      notes: notes || undefined,
    }));
    try {
      const res = await api.patch<VendorAssessmentDto>(
        `/vendors/${id}/assessment/${assessment.id}`,
        { answers },
      );
      setAssessment(res);
    } catch {
      // handled by api client
    }
  }, [assessment, assessmentAnswers, id, setAssessment]);

  const handleSubmitAssessment = useCallback(async () => {
    if (!assessment) {
      return;
    }
    await handleSaveAssessment();
    try {
      const res = await api.patch<VendorAssessmentDto>(
        `/vendors/${id}/assessment/${assessment.id}/submit`,
      );
      setAssessment(res);
    } catch {
      // handled by api client
    }
  }, [assessment, handleSaveAssessment, id, setAssessment]);

  const handleReviewAssessment = useCallback(
    async (status: 'APPROVED' | 'REJECTED') => {
      if (!assessment) {
        return;
      }
      try {
        const res = await api.patch<VendorAssessmentDto>(
          `/vendors/${id}/assessment/${assessment.id}/review`,
          { status, reviewNotes },
        );
        setAssessment(res);
      } catch {
        // handled by api client
      }
    },
    [assessment, id, reviewNotes, setAssessment],
  );

  const handleApprove = useCallback(() => {
    handleReviewAssessment(REVIEW_STATUS_APPROVED);
  }, [handleReviewAssessment]);

  const handleReject = useCallback(() => {
    handleReviewAssessment(REVIEW_STATUS_REJECTED);
  }, [handleReviewAssessment]);

  const handlePreviewQuestionnaire = useCallback(() => setQuestionnairePreviewOpen(true), []);

  if (loading) {
    return <LoadingView />;
  }

  if (!vendor) {
    return (
      <p className="mt-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
        {t(NO_RESULTS_KEY)}
      </p>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <HeaderActions
            canWrite={canWrite}
            canDelete={canDelete}
            onBack={handleBack}
            onEdit={handleEdit}
            onDelete={handleDelete}
            t={t}
          />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <VendorInfoCard vendor={vendor} t={t} />
        <DpaCard vendor={vendor} t={t} />
        <SubProcessorCard vendor={vendor} t={t} />
        <TreatmentsCard vendor={vendor} t={t} />
        <SubProcessorsCard vendor={vendor} t={t} />
        <AssessmentCard
          vendorId={vendor.id}
          assessment={assessment}
          assessmentAnswers={assessmentAnswers}
          setAssessmentAnswers={setAssessmentAnswers}
          canWrite={canWrite}
          canValidate={canValidate}
          reviewNotes={reviewNotes}
          onReviewNotesChange={handleReviewNotesChange}
          onStartAssessment={handleStartAssessment}
          onSaveAssessment={handleSaveAssessment}
          onSubmitAssessment={handleSubmitAssessment}
          onApprove={handleApprove}
          onReject={handleReject}
          onPreviewQuestionnaire={handlePreviewQuestionnaire}
          locale={locale}
          t={t}
        />
        <AuditCard vendor={vendor} t={t} />
      </div>

      <PdfPreviewDialog
        open={questionnairePreviewOpen}
        onOpenChange={setQuestionnairePreviewOpen}
        url={`/api/vendors/${vendor.id}/questionnaire`}
        title={t('pdfPreview.title.questionnaire')}
        downloadName={`vendor-questionnaire-${vendor.id}.pdf`}
      />
    </>
  );
}
