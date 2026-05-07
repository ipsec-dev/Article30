'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { RiskAssessment } from './types';

export interface UseRiskAssessmentResult {
  current: RiskAssessment | null;
  history: RiskAssessment[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: CreateRiskAssessmentInput) => Promise<void>;
}

export interface CreateRiskAssessmentInput {
  likelihood: RiskAssessment['likelihood'];
  severity: RiskAssessment['severity'];
  affectedDataCategories: string[];
  estimatedSubjectCount?: number;
  estimatedRecordCount?: number;
  crossBorder: boolean;
  potentialConsequences: string;
  mitigatingFactors?: string;
}

export function useRiskAssessment(violationId: string): UseRiskAssessmentResult {
  const [current, setCurrent] = useState<RiskAssessment | null>(null);
  const [history, setHistory] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentRes, historyRes] = await Promise.all([
        api.get<RiskAssessment | null>(`/violations/${violationId}/risk-assessment`),
        api.get<RiskAssessment[]>(`/violations/${violationId}/risk-assessment/history`),
      ]);
      setCurrent(currentRes);
      setHistory(historyRes);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [violationId]);

  const create = useCallback(
    async (input: CreateRiskAssessmentInput) => {
      await api.post(`/violations/${violationId}/risk-assessment`, input);
      await refresh();
    },
    [violationId, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { current, history, loading, error, refresh, create };
}
