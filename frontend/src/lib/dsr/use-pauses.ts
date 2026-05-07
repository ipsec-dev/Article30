'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { DsrPause } from './types';

export interface UsePausesResult {
  pauses: DsrPause[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function usePauses(dsrId: string): UsePausesResult {
  const [pauses, setPauses] = useState<DsrPause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<DsrPause[]>(`/dsr/${dsrId}/pauses`);
      setPauses(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [dsrId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { pauses, loading, error, refresh };
}
