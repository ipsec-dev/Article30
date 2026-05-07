import type { StatusKind } from '@/components/a30/status-dot';

export const PAGE_LIMIT = 20;
export const FILTER_ALL_VALUE = 'ALL';
export const STATUS_NEW = 'NEW';
export const STATUS_REVIEWED = 'REVIEWED';
export const STATUS_DISMISSED = 'DISMISSED';
export const IMPACT_KEY_PREFIX = 'regulatory.impactLevel.';
export const STATUS_KEY_PREFIX = 'regulatory.status.';
export const FILTER_ALL_KEY = 'regulatory.filterAll';

export const IMPACT_COLORS: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  LOW: 'bg-green-100 text-green-800',
};

export const STATUS_DOT_KIND: Record<string, StatusKind> = {
  NEW: 'primary',
  REVIEWED: 'neutral',
  DISMISSED: 'neutral',
};
