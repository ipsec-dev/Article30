'use client';

import { useCallback } from 'react';
import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '@/lib/dates';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/a30/status-dot';
import type { RegulatoryUpdateDto } from '@article30/shared';
import { EntryActions } from './entry-actions';
import {
  IMPACT_COLORS,
  IMPACT_KEY_PREFIX,
  STATUS_DISMISSED,
  STATUS_DOT_KIND,
  STATUS_KEY_PREFIX,
  STATUS_NEW,
  STATUS_REVIEWED,
} from './constants';

function getEntryBorderClass(status: string): string {
  if (status === STATUS_NEW) {
    return 'border-l-4 border-l-[var(--primary)] border-y-[var(--a30-border)] border-r-[var(--a30-border)]';
  }
  return 'border-[var(--a30-border)]';
}

function getSavedIcon(saved: boolean): React.ReactNode {
  if (saved) {
    return <BookmarkCheck className="size-4 text-amber-500" />;
  }
  return <Bookmark className="size-4" />;
}

function getChevronIcon(expanded: boolean): React.ReactNode {
  if (expanded) {
    return <ChevronUp className="size-4" style={{ color: 'var(--ink-3)' }} />;
  }
  return <ChevronDown className="size-4" style={{ color: 'var(--ink-3)' }} />;
}

type EntryCardProps = Readonly<{
  entry: RegulatoryUpdateDto;
  expanded: boolean;
  t: (key: string) => string;
  onToggleExpand: (id: string) => void;
  onToggleSaved: (id: string) => void;
  onSetImpact: (id: string, level: string) => void;
  onSetStatus: (id: string, status: string) => void;
}>;

export function EntryCard({
  entry,
  expanded,
  t,
  onToggleExpand,
  onToggleSaved,
  onSetImpact,
  onSetStatus,
}: EntryCardProps) {
  const handleExpand = useCallback(() => {
    onToggleExpand(entry.id);
  }, [entry.id, onToggleExpand]);

  const handleToggleSavedClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onToggleSaved(entry.id);
    },
    [entry.id, onToggleSaved],
  );

  const handleImpactChange = useCallback(
    (v: string) => {
      onSetImpact(entry.id, v);
    },
    [entry.id, onSetImpact],
  );

  const handleMarkReviewed = useCallback(() => {
    onSetStatus(entry.id, STATUS_REVIEWED);
  }, [entry.id, onSetStatus]);

  const handleDismiss = useCallback(() => {
    onSetStatus(entry.id, STATUS_DISMISSED);
  }, [entry.id, onSetStatus]);

  const handleRestoreNew = useCallback(() => {
    onSetStatus(entry.id, STATUS_NEW);
  }, [entry.id, onSetStatus]);

  const borderClass = getEntryBorderClass(entry.status);
  const savedIcon = getSavedIcon(entry.saved);
  const chevronIcon = getChevronIcon(expanded);

  return (
    <div className={`rounded-lg border ${borderClass}`} style={{ background: 'var(--surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left bg-transparent border-0 p-0"
          onClick={handleExpand}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate" style={{ color: 'var(--ink)' }}>
                {entry.title}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--ink-3)' }}>
              <Badge variant="outline" className="text-[10px]">
                {entry.source}
              </Badge>
              <span>{formatDate(entry.publishedAt)}</span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {entry.impactLevel && (
            <Badge className={IMPACT_COLORS[entry.impactLevel]}>
              {t(`${IMPACT_KEY_PREFIX}${entry.impactLevel}`)}
            </Badge>
          )}
          <StatusDot kind={STATUS_DOT_KIND[entry.status] ?? 'neutral'}>
            {t(`${STATUS_KEY_PREFIX}${entry.status}`)}
          </StatusDot>
          <button
            type="button"
            onClick={handleToggleSavedClick}
            aria-label={t(entry.saved ? 'regulatory.removeFromSaved' : 'regulatory.saveForLater')}
            aria-pressed={entry.saved}
            style={{ color: 'var(--ink-3)' }}
            className="hover:text-amber-500"
          >
            {savedIcon}
          </button>
          <button
            type="button"
            onClick={handleExpand}
            className="bg-transparent border-0 p-0"
            aria-label={entry.title}
          >
            {chevronIcon}
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="border-t px-4 py-3"
          style={{
            borderColor: 'var(--a30-border)',
            background: 'var(--surface-2)',
          }}
        >
          {entry.description && (
            <p className="mb-3 text-sm whitespace-pre-line" style={{ color: 'var(--ink-2)' }}>
              {entry.description}
            </p>
          )}

          <EntryActions
            entry={entry}
            t={t}
            onImpactChange={handleImpactChange}
            onMarkReviewed={handleMarkReviewed}
            onDismiss={handleDismiss}
            onRestoreNew={handleRestoreNew}
          />
        </div>
      )}
    </div>
  );
}
