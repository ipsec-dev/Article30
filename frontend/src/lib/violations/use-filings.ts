'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { NotificationFiling, PersonsNotification } from './types';

export interface UseFilingsResult {
  filings: NotificationFiling[];
  personsNotifications: PersonsNotification[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useFilings(violationId: string): UseFilingsResult {
  const [filings, setFilings] = useState<NotificationFiling[]>([]);
  const [personsNotifications, setPersonsNotifications] = useState<PersonsNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [f, p] = await Promise.all([
        api.get<NotificationFiling[]>(`/violations/${violationId}/filings`),
        api.get<PersonsNotification[]>(`/violations/${violationId}/persons-notifications`),
      ]);
      setFilings(f);
      setPersonsNotifications(p);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [violationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { filings, personsNotifications, loading, error, refresh };
}
