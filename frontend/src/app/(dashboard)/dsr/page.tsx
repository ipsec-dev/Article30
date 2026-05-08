'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/dates';
import { getMe } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusDot, type StatusKind } from '@/components/a30/status-dot';
import { Info, Copy, Check } from 'lucide-react';
import { Role, DsrType, DsrStatus, DSR_ROLES } from '@article30/shared';
import type {
  DataSubjectRequestDto,
  DsrStatsDto,
  UserDto,
  PaginatedResponse,
} from '@article30/shared';

const PAGE_SIZE = 10;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const WARN_DAYS_THRESHOLD = 7;
const COPY_TIMEOUT_MS = 2000;
const DSR_TYPE_KEY_PREFIX = 'dsr.type.';
const DSR_STATUS_KEY_PREFIX = 'dsr.status.';

const STATUS_KIND: Record<DsrStatus, StatusKind> = {
  [DsrStatus.RECEIVED]: 'info',
  [DsrStatus.ACKNOWLEDGED]: 'info',
  [DsrStatus.IDENTITY_VERIFIED]: 'primary',
  [DsrStatus.IN_PROGRESS]: 'warn',
  [DsrStatus.AWAITING_REQUESTER]: 'warn',
  [DsrStatus.RESPONDED]: 'success',
  [DsrStatus.PARTIALLY_FULFILLED]: 'success',
  [DsrStatus.REJECTED]: 'danger',
  [DsrStatus.WITHDRAWN]: 'neutral',
  [DsrStatus.CLOSED]: 'neutral',
};

function deadlineKind(deadline: string, overdue: boolean): StatusKind {
  if (overdue) return 'danger';
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / MS_PER_DAY);
  if (days <= WARN_DAYS_THRESHOLD) return 'warn';
  return 'success';
}

function deadlineLabel(
  t: (k: string, p?: Record<string, unknown>) => string,
  deadline: string,
): string {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / MS_PER_DAY);
  if (days < 0) {
    return t('dsr.daysOverdue', { count: Math.abs(days) }).replace(
      '{{count}}',
      String(Math.abs(days)),
    );
  }
  return t('dsr.daysRemaining', { count: days }).replace('{{count}}', String(days));
}

const HEADER_CLASS = 'px-4 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide';

interface DsrRowProps {
  request: DataSubjectRequestDto;
  t: (k: string, p?: Record<string, unknown>) => string;
}

function DsrRow({ request, t }: Readonly<DsrRowProps>) {
  const isOverdue =
    new Date(request.deadline).getTime() < Date.now() &&
    request.status !== DsrStatus.RESPONDED &&
    request.status !== DsrStatus.CLOSED;

  return (
    <tr
      className="transition-colors hover:bg-[var(--surface-2)]"
      style={{ borderTop: '1px solid var(--a30-border)', cursor: 'pointer' }}
    >
      {/* Type */}
      <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink-2)' }}>
        {t(`${DSR_TYPE_KEY_PREFIX}${request.type}`)}
      </td>

      {/* Réf. — links to detail */}
      <td className="px-4 py-3">
        <Link
          href={`/dsr/${request.id}`}
          className="num font-mono text-[12px] hover:underline"
          style={{ color: 'var(--primary)' }}
          onClick={e => e.stopPropagation()}
        >
          #{request.id.slice(0, 8).toUpperCase()}
        </Link>
      </td>

      {/* Personne */}
      <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
        {request.requesterName}
      </td>

      {/* Échéance */}
      <td className="px-4 py-3">
        <StatusDot kind={deadlineKind(request.deadline, isOverdue)}>
          {deadlineLabel(t, request.deadline)}
        </StatusDot>
        <div className="num mt-0.5 text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {formatDate(request.deadline)}
        </div>
      </td>

      {/* Statut */}
      <td className="px-4 py-3">
        <StatusDot kind={STATUS_KIND[request.status]}>
          {t(`${DSR_STATUS_KEY_PREFIX}${request.status}`)}
        </StatusDot>
      </td>
    </tr>
  );
}

type DsrStatsCardsProps = Readonly<{
  stats: DsrStatsDto;
  t: (k: string, p?: Record<string, unknown>) => string;
}>;

function DsrStatsCards({ stats, t }: DsrStatsCardsProps) {
  const overdueKind: StatusKind = stats.overdue > 0 ? 'danger' : 'neutral';
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('dsr.stats.total')}
          </p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            {stats.total}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('dsr.stats.overdue')}
          </p>
          <p
            className="mt-1 text-2xl font-semibold"
            style={{ color: `var(--${overdueKind === 'danger' ? 'danger' : 'ink'})` }}
          >
            {stats.overdue}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('dsr.stats.thisMonth')}
          </p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            {stats.thisMonth}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('dsr.stats.avgDays')}
          </p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            {stats.avgResponseDays.toFixed(1)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

type PublicFormInfoProps = Readonly<{
  publicFormUrl: string;
  copied: boolean;
  onCopy: () => void;
  t: (k: string, p?: Record<string, unknown>) => string;
}>;

function PublicFormInfo({ publicFormUrl, copied, onCopy, t }: PublicFormInfoProps) {
  const copyIcon = copied ? (
    <Check className="size-4" style={{ color: 'var(--success)' }} />
  ) : (
    <Copy className="size-4" />
  );
  return (
    <div
      className="mt-3 rounded-lg px-4 py-3"
      style={{ border: '1px solid var(--a30-accent)', background: 'var(--primary-50)' }}
    >
      <p className="text-sm" style={{ color: 'var(--primary)' }}>
        {t('dsr.publicEndpointDescription')}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code
          className="flex-1 truncate rounded px-3 py-1.5 text-xs"
          style={{
            background: 'var(--surface)',
            color: 'var(--ink-2)',
            border: '1px solid var(--a30-accent)',
          }}
        >
          {publicFormUrl}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={onCopy}
          aria-label={t(copied ? 'dsr.linkCopied' : 'dsr.copyLink')}
        >
          {copyIcon}
        </Button>
        <a
          href="/dsr/submit"
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap text-xs hover:underline"
          style={{ color: 'var(--primary)' }}
        >
          {t('dsr.openForm')}
        </a>
      </div>
    </div>
  );
}

type DsrFilterBarProps = Readonly<{
  filterStatus: string;
  filterType: string;
  filterOverdue: boolean;
  onFilterStatusChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFilterTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFilterOverdueChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFilters: () => void;
  t: (k: string, p?: Record<string, unknown>) => string;
}>;

function DsrFilterBar({
  filterStatus,
  filterType,
  filterOverdue,
  onFilterStatusChange,
  onFilterTypeChange,
  onFilterOverdueChange,
  onClearFilters,
  t,
}: DsrFilterBarProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <select
        className="rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
        style={{
          border: '1px solid var(--a30-border)',
          background: 'var(--surface)',
          color: 'var(--ink)',
        }}
        value={filterStatus}
        onChange={onFilterStatusChange}
      >
        <option value="">{t('common.status')}</option>
        {Object.values(DsrStatus).map(s => (
          <option key={s} value={s}>
            {t(`${DSR_STATUS_KEY_PREFIX}${s}`)}
          </option>
        ))}
      </select>

      <select
        className="rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
        style={{
          border: '1px solid var(--a30-border)',
          background: 'var(--surface)',
          color: 'var(--ink)',
        }}
        value={filterType}
        onChange={onFilterTypeChange}
      >
        <option value="">Type</option>
        {Object.values(DsrType).map(tp => (
          <option key={tp} value={tp}>
            {t(`${DSR_TYPE_KEY_PREFIX}${tp}`)}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
        <input
          type="checkbox"
          checked={filterOverdue}
          onChange={onFilterOverdueChange}
          className="rounded"
          style={{ borderColor: 'var(--a30-border)' }}
        />
        {t('dsr.overdue')}
      </label>

      {(filterStatus || filterType || filterOverdue) && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          {t('common.cancel')}
        </Button>
      )}
    </div>
  );
}

type DsrTableProps = Readonly<{
  requests: DataSubjectRequestDto[];
  page: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  t: (k: string, p?: Record<string, unknown>) => string;
}>;

function DsrTable({ requests, page, totalPages, onPrevPage, onNextPage, t }: DsrTableProps) {
  return (
    <>
      <div className="a30-card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th className={HEADER_CLASS} style={{ color: 'var(--ink-3)' }}>
                  Type
                </th>
                <th className={HEADER_CLASS} style={{ color: 'var(--ink-3)' }}>
                  Réf.
                </th>
                <th className={HEADER_CLASS} style={{ color: 'var(--ink-3)' }}>
                  Personne
                </th>
                <th className={HEADER_CLASS} style={{ color: 'var(--ink-3)' }}>
                  Échéance
                </th>
                <th className={HEADER_CLASS} style={{ color: 'var(--ink-3)' }}>
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <DsrRow key={r.id} request={r} t={t} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
          {t('common.page')} {page} {t('common.of')} {totalPages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrevPage}>
            {t('common.previous')}
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={onNextPage}>
            {t('common.next')}
          </Button>
        </div>
      </div>
    </>
  );
}

function renderDsrContent(args: {
  loading: boolean;
  requests: DataSubjectRequestDto[];
  page: number;
  totalPages: number;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  t: (key: string) => string;
}): React.ReactNode {
  const { loading, requests, page, totalPages, handlePrevPage, handleNextPage, t } = args;
  if (loading) {
    return (
      <div className="mt-8 flex justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-[var(--a30-border)] border-t-indigo-600" />
      </div>
    );
  }
  if (requests.length === 0) {
    return (
      <p className="mt-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
        {t('common.noResults')}
      </p>
    );
  }
  return (
    <DsrTable
      requests={requests}
      page={page}
      totalPages={totalPages}
      onPrevPage={handlePrevPage}
      onNextPage={handleNextPage}
      t={t}
    />
  );
}

export default function DsrPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(null);
  const [requests, setRequests] = useState<DataSubjectRequestDto[]>([]);
  const [stats, setStats] = useState<DsrStatsDto | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const publicFormUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/dsr/submit`; // NOSONAR S7764 — browser-specific location API

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(publicFormUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_TIMEOUT_MS);
  }, [publicFormUrl]);

  const handleShowInfo = useCallback(() => {
    setShowInfo(prev => !prev);
  }, []);

  const handleNewRequest = useCallback(() => {
    router.push('/dsr/new');
  }, [router]);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);

  const handleFilterStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
  }, []);

  const handleFilterTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value);
  }, []);

  const handleFilterOverdueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterOverdue(e.target.checked);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilterStatus('');
    setFilterType('');
    setFilterOverdue(false);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPage(p => p - 1);
  }, []);

  const handleNextPage = useCallback(() => {
    setPage(p => p + 1);
  }, []);

  const canAccess = user && (DSR_ROLES as readonly Role[]).includes(user.role);

  const fetchData = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(p));
        params.set('limit', String(PAGE_SIZE));
        if (filterStatus) {
          params.set('status', filterStatus);
        }
        if (filterType) {
          params.set('type', filterType);
        }
        if (filterOverdue) {
          params.set('overdue', 'true');
        }

        const [list, statsRes] = await Promise.all([
          api.get<PaginatedResponse<DataSubjectRequestDto>>(`/dsr?${params.toString()}`),
          api.get<DsrStatsDto>('/dsr/stats'),
        ]);
        setRequests(list.data);
        setTotal(list.total);
        setStats(statsRes);
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [filterStatus, filterType, filterOverdue],
  );

  useEffect(() => {
    getMe().then(u => setUser(u));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterType, filterOverdue]);

  useEffect(() => {
    if (!canAccess) {
      return;
    }
    fetchData(page);
  }, [page, canAccess, fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const content = renderDsrContent({
    loading,
    requests,
    page,
    totalPages,
    handlePrevPage,
    handleNextPage,
    t,
  });

  if (user && !canAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-medium" style={{ color: 'var(--ink)' }}>
              {t('dsr.accessDenied.title')}
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-2)' }}>
              {t('dsr.accessDenied.body')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleShowInfo}>
          <Info className="mr-1.5 size-4" />
          {t('dsr.publicEndpoint')}
        </Button>
        {canAccess && (
          <Button size="sm" onClick={handleNewRequest}>
            {t('dsr.newRequest')}
          </Button>
        )}
      </div>

      {/* Public form info panel */}
      {showInfo && (
        <PublicFormInfo publicFormUrl={publicFormUrl} copied={copied} onCopy={handleCopy} t={t} />
      )}

      {/* Stats cards */}
      {stats && <DsrStatsCards stats={stats} t={t} />}

      {/* Filter bar */}
      <DsrFilterBar
        filterStatus={filterStatus}
        filterType={filterType}
        filterOverdue={filterOverdue}
        onFilterStatusChange={handleFilterStatusChange}
        onFilterTypeChange={handleFilterTypeChange}
        onFilterOverdueChange={handleFilterOverdueChange}
        onClearFilters={handleClearFilters}
        t={t}
      />

      {/* Article30-styled DSR table */}
      {content}
    </>
  );
}
