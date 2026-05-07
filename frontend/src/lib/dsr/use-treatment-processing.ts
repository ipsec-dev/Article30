'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type {
  DsrTreatmentProcessing,
  TreatmentProcessingActionTaken,
  VendorPropagationStatus,
} from './types';

export interface UpsertProcessingPayload {
  actionTaken: TreatmentProcessingActionTaken;
  vendorPropagationStatus: VendorPropagationStatus;
  findingsSummary?: string;
}

export interface UseTreatmentProcessingResult {
  processingLogs: DsrTreatmentProcessing[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  upsert: (treatmentId: string, payload: UpsertProcessingPayload) => Promise<void>;
  link: (treatmentId: string) => Promise<void>;
}

export function useTreatmentProcessing(dsrId: string): UseTreatmentProcessingResult {
  const [processingLogs, setProcessingLogs] = useState<DsrTreatmentProcessing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<DsrTreatmentProcessing[]>(`/dsr/${dsrId}/treatments/processing`);
      setProcessingLogs(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [dsrId]);

  const upsert = useCallback(
    async (treatmentId: string, payload: UpsertProcessingPayload) => {
      await api.patch(`/dsr/${dsrId}/treatments/${treatmentId}/processing`, payload);
      await refresh();
    },
    [dsrId, refresh],
  );

  const link = useCallback(
    async (treatmentId: string) => {
      await api.post(`/dsr/${dsrId}/treatments/${treatmentId}/link`);
      await refresh();
    },
    [dsrId, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { processingLogs, loading, error, refresh, upsert, link };
}
