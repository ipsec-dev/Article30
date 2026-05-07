'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PaginatedResponse, ScreeningDto } from '@article30/shared';

const VERDICT_COLORS: Record<string, string> = {
  GREEN: 'bg-green-100 text-green-800',
  ORANGE: 'bg-amber-100 text-amber-800',
  RED: 'bg-red-100 text-red-800',
};

const PAGE_SIZE = 20;

export default function ScreeningListPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<ScreeningDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<ScreeningDto>>(`/screenings?page=${page}&limit=${PAGE_SIZE}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNewScreening = useCallback(() => router.push('/checklist/new'), [router]);
  const handlePrevPage = useCallback(() => setPage(p => p - 1), []);
  const handleNextPage = useCallback(() => setPage(p => p + 1), []);
  const handleNavigateToScreening = useCallback(
    (id: string) => router.push(`/checklist/${id}`),
    [router],
  );

  let totalPages = 0;
  if (data) {
    totalPages = Math.ceil(data.total / data.limit);
  }

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="mt-8 flex justify-center">
        <div
          className="size-8 animate-spin rounded-full border-4"
          style={{ borderColor: 'var(--a30-border)', borderTopColor: 'var(--primary)' }}
        />
      </div>
    );
  } else if (!data || data.data.length === 0) {
    body = (
      <div className="mt-12 flex flex-col items-center text-center">
        <ClipboardCheck className="size-12" style={{ color: 'var(--ink-3)' }} />
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-3)' }}>
          {t('screening.empty')}
        </p>
      </div>
    );
  } else {
    body = (
      <>
        <div
          className="mt-6 overflow-x-auto rounded-lg border"
          style={{ borderColor: 'var(--a30-border)', background: 'var(--surface)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b text-left"
                style={{ borderColor: 'var(--a30-border)', background: 'var(--surface-2)' }}
              >
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--ink-2)' }}>
                  {t('treatment.name')}
                </th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--ink-2)' }}>
                  {t('screening.verdict')}
                </th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--ink-2)' }}>
                  {t('screening.score')}
                </th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--ink-2)' }}>
                  {t('screening.linkedTreatment')}
                </th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--ink-2)' }}>
                  {t('screening.createdBy')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.data.map(s => (
                <ScreeningRow
                  key={s.id}
                  screening={s}
                  onNavigate={handleNavigateToScreening}
                  verdictLabel={t(`screening.verdict.${s.verdict}`)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={handlePrevPage}>
              {t('common.previous')}
            </Button>
            <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
              {t('common.page')} {page} {t('common.of')} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={handleNextPage}
            >
              {t('common.next')}
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button size="sm" onClick={handleNewScreening}>
          {t('checklist.heroCta')}
        </Button>
      </div>

      {body}
    </>
  );
}

interface ScreeningRowProps {
  screening: ScreeningDto;
  onNavigate: (id: string) => void;
  verdictLabel: string;
}

function ScreeningRow({ screening, onNavigate, verdictLabel }: Readonly<ScreeningRowProps>) {
  const handleClick = useCallback(() => onNavigate(screening.id), [onNavigate, screening.id]);
  let treatmentName = '—';
  if (screening.treatment) {
    treatmentName = screening.treatment.name;
  }
  return (
    <tr
      className="cursor-pointer border-b"
      style={{ borderColor: 'var(--a30-border)' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-2)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLTableRowElement).style.background = '';
      }}
      onClick={handleClick}
    >
      <td className="px-4 py-3 font-medium" style={{ color: 'var(--ink)' }}>
        {screening.title}
      </td>
      <td className="px-4 py-3">
        <Badge className={VERDICT_COLORS[screening.verdict]}>{verdictLabel}</Badge>
      </td>
      <td className="px-4 py-3" style={{ color: 'var(--ink-2)' }}>
        {screening.score}%
      </td>
      <td className="px-4 py-3" style={{ color: 'var(--ink-2)' }}>
        {treatmentName}
      </td>
      <td className="px-4 py-3" style={{ color: 'var(--ink-2)' }}>
        {screening.creator ? `${screening.creator.firstName} ${screening.creator.lastName}` : '—'}
      </td>
    </tr>
  );
}
