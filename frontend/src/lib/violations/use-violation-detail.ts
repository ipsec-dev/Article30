'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { ViolationDetail, ViolationStatus } from './types';

export interface UseViolationDetailResult {
  violation: ViolationDetail | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  transition: (target: ViolationStatus, payload?: Record<string, unknown>) => Promise<void>;
}

export function useViolationDetail(violationId: string): UseViolationDetailResult {
  const [violation, setViolation] = useState<ViolationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const v = await api.get<ViolationDetail>(`/violations/${violationId}`);
      setViolation(v);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [violationId]);

  const transition = useCallback(
    async (target: ViolationStatus, payload?: Record<string, unknown>) => {
      await api.patch(`/violations/${violationId}/transition`, {
        target,
        payload: payload ?? {},
      });
      await refresh();
    },
    [violationId, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { violation, loading, error, refresh, transition };
}
