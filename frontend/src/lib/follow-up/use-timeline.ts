import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { EntityType, TimelineEvent } from './types';

export interface UseTimelineResult {
  events: TimelineEvent[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useTimeline(entityType: EntityType, entityId: string): UseTimelineResult {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<TimelineEvent[]>(`/follow-up/timeline/${entityType}/${entityId}`);
      setEvents(res);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { events, loading, error, refresh };
}
