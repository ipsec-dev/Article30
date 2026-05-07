'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RegulatoryUpdateDto } from '@article30/shared';
import { IMPACT_KEY_PREFIX, STATUS_DISMISSED, STATUS_KEY_PREFIX, STATUS_NEW } from './constants';

type EntryActionsProps = Readonly<{
  entry: RegulatoryUpdateDto;
  t: (key: string) => string;
  onImpactChange: (v: string) => void;
  onMarkReviewed: () => void;
  onDismiss: () => void;
  onRestoreNew: () => void;
}>;

export function EntryActions({
  entry,
  t,
  onImpactChange,
  onMarkReviewed,
  onDismiss,
  onRestoreNew,
}: EntryActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={entry.impactLevel ?? ''} onValueChange={onImpactChange}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder={t('regulatory.impactLevel')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="HIGH">{t(`${IMPACT_KEY_PREFIX}HIGH`)}</SelectItem>
          <SelectItem value="MEDIUM">{t(`${IMPACT_KEY_PREFIX}MEDIUM`)}</SelectItem>
          <SelectItem value="LOW">{t(`${IMPACT_KEY_PREFIX}LOW`)}</SelectItem>
        </SelectContent>
      </Select>

      {entry.status === STATUS_NEW && (
        <Button variant="outline" size="sm" onClick={onMarkReviewed}>
          {t('regulatory.markReviewed')}
        </Button>
      )}

      {entry.status !== STATUS_DISMISSED && (
        <Button variant="ghost" size="sm" style={{ color: 'var(--ink-3)' }} onClick={onDismiss}>
          {t('regulatory.dismiss')}
        </Button>
      )}

      {entry.status === STATUS_DISMISSED && (
        <Button variant="outline" size="sm" onClick={onRestoreNew}>
          {t(`${STATUS_KEY_PREFIX}${STATUS_NEW}`)}
        </Button>
      )}

      {entry.url && (
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs hover:underline"
          style={{ color: 'var(--primary)' }}
        >
          <ExternalLink className="size-3" />
          {t('regulatory.openSource')}
        </a>
      )}
    </div>
  );
}
