'use client';

import { BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FILTER_ALL_KEY,
  FILTER_ALL_VALUE,
  IMPACT_KEY_PREFIX,
  STATUS_DISMISSED,
  STATUS_KEY_PREFIX,
  STATUS_NEW,
  STATUS_REVIEWED,
} from './constants';

type FilterBarProps = Readonly<{
  statusFilter: string;
  impactFilter: string;
  sourceFilter: string;
  savedFilter: boolean;
  t: (key: string) => string;
  onStatusFilterChange: (v: string) => void;
  onImpactFilterChange: (v: string) => void;
  onSourceFilterChange: (v: string) => void;
  onToggleSavedFilter: () => void;
}>;

export function FilterBar({
  statusFilter,
  impactFilter,
  sourceFilter,
  savedFilter,
  t,
  onStatusFilterChange,
  onImpactFilterChange,
  onSourceFilterChange,
  onToggleSavedFilter,
}: FilterBarProps) {
  let savedFilterVariant: 'default' | 'outline' = 'outline';
  if (savedFilter) {
    savedFilterVariant = 'default';
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('regulatory.status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTER_ALL_VALUE}>{t(FILTER_ALL_KEY)}</SelectItem>
          <SelectItem value={STATUS_NEW}>{t(`${STATUS_KEY_PREFIX}${STATUS_NEW}`)}</SelectItem>
          <SelectItem value={STATUS_REVIEWED}>
            {t(`${STATUS_KEY_PREFIX}${STATUS_REVIEWED}`)}
          </SelectItem>
          <SelectItem value={STATUS_DISMISSED}>
            {t(`${STATUS_KEY_PREFIX}${STATUS_DISMISSED}`)}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select value={impactFilter} onValueChange={onImpactFilterChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('regulatory.impactLevel')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTER_ALL_VALUE}>{t(FILTER_ALL_KEY)}</SelectItem>
          <SelectItem value="HIGH">{t(`${IMPACT_KEY_PREFIX}HIGH`)}</SelectItem>
          <SelectItem value="MEDIUM">{t(`${IMPACT_KEY_PREFIX}MEDIUM`)}</SelectItem>
          <SelectItem value="LOW">{t(`${IMPACT_KEY_PREFIX}LOW`)}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('regulatory.source')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTER_ALL_VALUE}>{t(FILTER_ALL_KEY)}</SelectItem>
          <SelectItem value="CNIL">CNIL</SelectItem>
          <SelectItem value="EDPB">EDPB</SelectItem>
        </SelectContent>
      </Select>

      <Button variant={savedFilterVariant} size="sm" onClick={onToggleSavedFilter}>
        <BookmarkCheck className="mr-1.5 size-4" />
        {t('regulatory.filterSaved')}
      </Button>
    </div>
  );
}
