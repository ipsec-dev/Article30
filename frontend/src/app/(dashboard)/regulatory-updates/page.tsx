'use client';

import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import type { PaginatedResponse, RegulatoryUpdateDto } from '@article30/shared';
import { FilterBar } from './_components/filter-bar';
import { SyncToolbar } from './_components/sync-toolbar';
import { UpdatesList } from './_components/updates-list';
import { FILTER_ALL_VALUE, PAGE_LIMIT, STATUS_NEW } from './_components/constants';

export default function RegulatoryUpdatesPage() {
  const { t } = useI18n();
  const [data, setData] = useState<PaginatedResponse<RegulatoryUpdateDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_NEW);
  const [impactFilter, setImpactFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [savedFilter, setSavedFilter] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_LIMIT));
    if (statusFilter) params.set('status', statusFilter);
    if (impactFilter) params.set('impactLevel', impactFilter);
    if (sourceFilter) params.set('source', sourceFilter);
    if (savedFilter) params.set('saved', 'true');
    api
      .get<PaginatedResponse<RegulatoryUpdateDto>>(`/regulatory-updates?${params}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, statusFilter, impactFilter, sourceFilter, savedFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await api.post<{ newEntries: number }>('/regulatory-updates/sync');
      let message;
      if (result.newEntries > 0) {
        message = t('regulatory.syncResult').replace('{count}', String(result.newEntries));
      } else {
        message = t('regulatory.syncUpToDate');
      }
      setSyncMessage(message);
      fetchData();
    } catch {
    } finally {
      setSyncing(false);
    }
  }, [t, fetchData]);

  const handleImpactLevel = useCallback(
    async (id: string, impactLevel: string) => {
      await api.patch(`/regulatory-updates/${id}/impact`, { impactLevel });
      fetchData();
    },
    [fetchData],
  );

  const handleStatus = useCallback(
    async (id: string, status: string) => {
      await api.patch(`/regulatory-updates/${id}/status`, { status });
      fetchData();
    },
    [fetchData],
  );

  const handleToggleSaved = useCallback(
    async (id: string) => {
      await api.patch(`/regulatory-updates/${id}/saved`);
      fetchData();
    },
    [fetchData],
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  const handleStatusFilterChange = useCallback((v: string) => {
    setStatusFilter(v === FILTER_ALL_VALUE ? '' : v);
    setPage(1);
  }, []);

  const handleImpactFilterChange = useCallback((v: string) => {
    setImpactFilter(v === FILTER_ALL_VALUE ? '' : v);
    setPage(1);
  }, []);

  const handleSourceFilterChange = useCallback((v: string) => {
    setSourceFilter(v === FILTER_ALL_VALUE ? '' : v);
    setPage(1);
  }, []);

  const handleToggleSavedFilter = useCallback(() => {
    setSavedFilter(prev => !prev);
    setPage(1);
  }, []);

  const handlePrevPage = useCallback(() => setPage(p => p - 1), []);
  const handleNextPage = useCallback(() => setPage(p => p + 1), []);

  return (
    <>
      <SyncToolbar syncing={syncing} syncMessage={syncMessage} t={t} onSync={handleSync} />
      <FilterBar
        statusFilter={statusFilter}
        impactFilter={impactFilter}
        sourceFilter={sourceFilter}
        savedFilter={savedFilter}
        t={t}
        onStatusFilterChange={handleStatusFilterChange}
        onImpactFilterChange={handleImpactFilterChange}
        onSourceFilterChange={handleSourceFilterChange}
        onToggleSavedFilter={handleToggleSavedFilter}
      />
      <UpdatesList
        loading={loading}
        data={data}
        expandedId={expandedId}
        page={page}
        t={t}
        onToggleExpand={handleToggleExpand}
        onToggleSaved={handleToggleSaved}
        onSetImpact={handleImpactLevel}
        onSetStatus={handleStatus}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
      />
    </>
  );
}
