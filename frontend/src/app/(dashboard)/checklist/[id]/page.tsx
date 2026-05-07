'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, ArrowRight, Eye } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PdfPreviewDialog } from '@/components/domain/pdf-preview-dialog';
import { RiskMatrix } from '@/components/dpia/risk-matrix';
import { SCREENING_QUESTIONS, ChecklistAnswer } from '@article30/shared';
import type { ScreeningDto } from '@article30/shared';

const VERDICT_COLORS: Record<string, string> = {
  GREEN: 'bg-green-100 text-green-800',
  ORANGE: 'bg-amber-100 text-amber-800',
  RED: 'bg-red-100 text-red-800',
};

const ANSWER_COLORS: Record<string, string> = {
  YES: 'text-green-700',
  NA: 'text-[var(--ink-3)]',
  PARTIAL: 'text-amber-700',
  IN_PROGRESS: 'text-amber-600',
  NO: 'text-red-700',
};

/** Map screening verdict → RiskMatrix likelihood axis (read-only preview). */
type RiskLevel = 'low' | 'medium' | 'high';

function verdictToLikelihood(verdict: string): RiskLevel {
  if (verdict === 'GREEN') return 'low';
  if (verdict === 'ORANGE') return 'medium';
  return 'high';
}

function scoreToSeverity(score: number): RiskLevel {
  if (score >= 75) return 'low';
  if (score >= 40) return 'medium';
  return 'high';
}

function verdictBarColor(verdict: string): string {
  if (verdict === 'GREEN') {
    return 'var(--success)';
  }
  if (verdict === 'ORANGE') {
    return 'var(--warn)';
  }
  return 'var(--danger)';
}

function localizedLabel(label: { fr: string; en: string }, locale: string): string {
  if (locale === 'fr') {
    return label.fr;
  }
  return label.en;
}

export default function ScreeningResultPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [screening, setScreening] = useState<ScreeningDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    api
      .get<ScreeningDto>(`/screenings/${id}`)
      .then(setScreening)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportPdf = useCallback(() => {
    globalThis.open(`/api/screenings/${id}/pdf?locale=${locale}`, '_blank');
  }, [id, locale]);

  const handlePreviewPdf = useCallback(() => setPreviewOpen(true), []);

  const handleGoToTreatment = useCallback(() => {
    if (screening?.treatmentId) {
      router.push(`/register/${screening.treatmentId}`);
    }
  }, [router, screening?.treatmentId]);

  const handleBackToList = useCallback(() => router.push('/checklist'), [router]);

  const handleConvert = useCallback(async () => {
    setConverting(true);
    try {
      const result = await api.post<{ treatmentId: string }>(`/screenings/${id}/convert`);
      router.push(`/register/${result.treatmentId}`);
    } catch {
      // handled by api client toast
    } finally {
      setConverting(false);
    }
  }, [id, router]);

  if (loading || !screening) {
    return (
      <div className="mt-8 flex justify-center">
        <div
          className="size-8 animate-spin rounded-full border-4"
          style={{ borderColor: 'var(--a30-border)', borderTopColor: 'var(--primary)' }}
        />
      </div>
    );
  }

  const responses = screening.responses;
  const redFlags = SCREENING_QUESTIONS.filter(
    q => responses[q.id] === ChecklistAnswer.NO || responses[q.id] === ChecklistAnswer.PARTIAL,
  );

  let treatmentButton: React.ReactNode;
  if (screening.treatmentId) {
    treatmentButton = (
      <Button variant="outline" size="sm" onClick={handleGoToTreatment}>
        {t('screening.alreadyConverted')}
        <ArrowRight className="ml-1.5 size-4" />
      </Button>
    );
  } else {
    treatmentButton = (
      <Button size="sm" onClick={handleConvert} disabled={converting}>
        {t('screening.convertToTreatment')}
      </Button>
    );
  }

  const riskLikelihood = verdictToLikelihood(screening.verdict);
  const riskSeverity = scoreToSeverity(screening.score);

  return (
    <>
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-end gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handlePreviewPdf}>
            <Eye className="mr-1.5 size-4" />
            {t('register.previewPdf')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="mr-1.5 size-4" />
            {t('screening.exportPdf')}
          </Button>
          {treatmentButton}
        </div>
      </div>

      {/* Verdict + score */}
      <div className="flex items-center gap-4">
        <Badge className={`text-base px-4 py-1 ${VERDICT_COLORS[screening.verdict]}`}>
          {t(`screening.verdict.${screening.verdict}`)}
        </Badge>
        <div className="flex-1">
          <div className="h-3 rounded-full" style={{ background: 'var(--surface-2)' }}>
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${screening.score}%`,
                background: verdictBarColor(screening.verdict),
              }}
            />
          </div>
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
          {screening.score}%
        </span>
      </div>

      <p className="mt-2 text-xs" style={{ color: 'var(--ink-3)' }}>
        {t('screening.createdBy')}:{' '}
        {screening.creator ? `${screening.creator.firstName} ${screening.creator.lastName}` : ''} —{' '}
        {formatDate(screening.createdAt)}
      </p>

      {/* Risk Matrix — read-only preview derived from verdict + score */}
      <div className="mt-6 max-w-md">
        <p
          className="mb-2 text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--ink-3)' }}
        >
          Positionnement risque
        </p>
        <RiskMatrix
          selectedLikelihood={riskLikelihood}
          selectedSeverity={riskSeverity}
          ariaLabel="Matrice de risques — résultat du screening"
        />
      </div>

      {/* Red flags */}
      {redFlags.length > 0 ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">{t('screening.redFlags')}</p>
          <ul className="mt-2 space-y-1">
            {redFlags.map(q => (
              <li key={q.id} className="text-sm text-red-700">
                • {q.articleRef} — {localizedLabel(q.label, locale)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-800">{t('screening.noRedFlags')}</p>
        </div>
      )}

      {/* All answers */}
      <div className="mt-6 space-y-2">
        {SCREENING_QUESTIONS.map((q, i) => {
          const answer = responses[q.id];
          return (
            <div
              key={q.id}
              className="flex items-center gap-3 rounded-md border px-4 py-2"
              style={{ borderColor: 'var(--a30-border)', background: 'var(--surface)' }}
            >
              <span className="text-xs w-6" style={{ color: 'var(--ink-3)' }}>
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm" style={{ color: 'var(--ink)' }}>
                  {localizedLabel(q.label, locale)}
                </p>
                <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                  {q.articleRef}
                </p>
              </div>
              <span
                className={`text-sm font-medium ${ANSWER_COLORS[answer] ?? 'text-[var(--ink-3)]'}`}
              >
                {t(`checklist.answer.${answer}`)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <Button variant="ghost" size="sm" onClick={handleBackToList}>
          <ArrowLeft className="mr-1.5 size-4" />
          {t('screening.backToList')}
        </Button>
      </div>

      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        url={`/api/screenings/${id}/pdf?locale=${locale}`}
        title={t('pdfPreview.title.screening')}
        downloadName={`screening-${id}.pdf`}
      />
    </>
  );
}
