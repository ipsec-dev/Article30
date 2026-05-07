'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { DsrDetail, DsrStateMachineStatus } from './types';

export interface UseDsrDetailResult {
  dsr: DsrDetail | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  transition: (target: DsrStateMachineStatus, payload?: Record<string, unknown>) => Promise<void>;
}

export function useDsrDetail(dsrId: string): UseDsrDetailResult {
  const [dsr, setDsr] = useState<DsrDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<DsrDetail>(`/dsr/${dsrId}`);
      setDsr(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [dsrId]);

  const transition = useCallback(
    async (target: DsrStateMachineStatus, payload?: Record<string, unknown>) => {
      await api.patch(`/dsr/${dsrId}/transition`, {
        target,
        payload: payload ?? {},
      });
      await refresh();
    },
    [dsrId, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { dsr, loading, error, refresh, transition };
}
