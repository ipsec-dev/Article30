'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { RegulatorInteraction } from './types';

export interface UseRegulatorInteractionsResult {
  interactions: RegulatorInteraction[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  record: (input: RecordRegulatorInteractionInput) => Promise<void>;
}

export interface RecordRegulatorInteractionInput {
  direction: RegulatorInteraction['direction'];
  kind: RegulatorInteraction['kind'];
  occurredAt: string;
  referenceNumber?: string;
  summary: string;
}

export function useRegulatorInteractions(violationId: string): UseRegulatorInteractionsResult {
  const [interactions, setInteractions] = useState<RegulatorInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<RegulatorInteraction[]>(
        `/violations/${violationId}/regulator-interactions`,
      );
      setInteractions(res);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [violationId]);

  const record = useCallback(
    async (input: RecordRegulatorInteractionInput) => {
      await api.post(`/violations/${violationId}/regulator-interactions`, input);
      await refresh();
    },
    [violationId, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { interactions, loading, error, refresh, record };
}
