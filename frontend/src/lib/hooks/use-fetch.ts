'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

interface UseFetch<T> {
  data: T | null;
  loading: boolean;
  /** Re-issues the GET; replaces data on success, leaves it untouched on failure. */
  refetch: () => Promise<void>;
  /**
   * Manual override after a mutation that already returned the updated entity.
   * Wrapped in useCallback so callers can include it in dependency arrays
   * without retriggering memoization.
   */
  setData: (next: T | null) => void;
}

/**
 * Fetches a JSON document from the backend on mount, exposes a `refetch`
 * trigger for after-mutation refresh, and a `setData` setter for callers
 * that already received an updated entity from a PATCH/POST response.
 *
 * Errors are swallowed silently — most detail pages already render an empty
 * state when `data` stays null. Pass an explicit handler if you need toast.
 */
export function useFetch<T>(path: string | null): UseFetch<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);

  const refetch = useCallback(async () => {
    if (path === null) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<T>(path);
      setData(res);
    } catch {
      // silently fail — caller decides how to surface the empty state
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, refetch, setData };
}
