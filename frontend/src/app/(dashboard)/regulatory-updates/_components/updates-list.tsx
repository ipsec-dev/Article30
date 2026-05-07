'use client';

import { Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaginatedResponse, RegulatoryUpdateDto } from '@article30/shared';
import { EntryCard } from './entry-card';

type UpdatesListProps = Readonly<{
  loading: boolean;
  data: PaginatedResponse<RegulatoryUpdateDto> | null;
  expandedId: string | null;
  page: number;
  t: (key: string) => string;
  onToggleExpand: (id: string) => void;
  onToggleSaved: (id: string) => void;
  onSetImpact: (id: string, level: string) => void;
  onSetStatus: (id: string, status: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}>;

export function UpdatesList({
  loading,
  data,
  expandedId,
  page,
  t,
  onToggleExpand,
  onToggleSaved,
  onSetImpact,
  onSetStatus,
  onPrevPage,
  onNextPage,
}: UpdatesListProps) {
  if (loading) {
    return (
      <div className="mt-8 flex justify-center">
        <div
          className="size-8 animate-spin rounded-full border-4"
          style={{ borderColor: 'var(--a30-border)', borderTopColor: 'var(--primary)' }}
        />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="mt-12 flex flex-col items-center text-center">
        <Newspaper className="size-12" style={{ color: 'var(--ink-3)' }} />
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-3)' }}>
          {t('regulatory.empty')}
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <>
      <div className="mt-4 space-y-2">
        {data.data.map(entry => (
          <EntryCard
            key={entry.id}
            entry={entry}
            expanded={expandedId === entry.id}
            t={t}
            onToggleExpand={onToggleExpand}
            onToggleSaved={onToggleSaved}
            onSetImpact={onSetImpact}
            onSetStatus={onSetStatus}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrevPage}>
            {t('common.previous')}
          </Button>
          <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
            {t('common.page')} {page} {t('common.of')} {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={onNextPage}>
            {t('common.next')}
          </Button>
        </div>
      )}
    </>
  );
}
