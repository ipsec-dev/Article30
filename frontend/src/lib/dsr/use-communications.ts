'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type {
  DsrCommunication,
  RequesterCommunicationKind,
  RequesterCommunicationChannel,
} from './types';

export interface RecordCommunicationPayload {
  kind: RequesterCommunicationKind;
  channel: RequesterCommunicationChannel;
  sentAt: string;
  contentRevisionId?: string;
}

export interface UseCommunicationsResult {
  communications: DsrCommunication[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  record: (payload: RecordCommunicationPayload) => Promise<void>;
}

export function useCommunications(dsrId: string): UseCommunicationsResult {
  const [communications, setCommunications] = useState<DsrCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<DsrCommunication[]>(`/dsr/${dsrId}/communications`);
      setCommunications(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [dsrId]);

  const record = useCallback(
    async (payload: RecordCommunicationPayload) => {
      await api.post(`/dsr/${dsrId}/communications`, payload);
      await refresh();
    },
    [dsrId, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { communications, loading, error, refresh, record };
}
