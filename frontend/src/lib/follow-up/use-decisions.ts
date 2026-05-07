'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { EntityType } from './types';

export interface DecisionRow {
  id: string;
  organizationId: string;
  entityType: EntityType;
  entityId: string;
  kind: string;
  outcome: Record<string, unknown>;
  rationale: string;
  inputsSnapshot: Record<string, unknown>;
  decidedBy: string;
  decidedAt: string;
  supersededByDecisionId: string | null;
}

export interface UseDecisionsResult {
  decisions: DecisionRow[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useDecisions(entityType: EntityType, entityId: string): UseDecisionsResult {
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DecisionRow[]>(`/follow-up/decisions/${entityType}/${entityId}`);
      setDecisions(res);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { decisions, loading, error, refresh };
}
