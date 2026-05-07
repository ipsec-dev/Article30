'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { ActionItem } from './types';

export interface UseActionItemsResult {
  items: ActionItem[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: CreateActionItemInput) => Promise<void>;
  update: (actionItemId: string, input: UpdateActionItemInput) => Promise<void>;
}

export interface CreateActionItemInput {
  title: string;
  description?: string;
  ownerId: string;
  deadline: string;
}

export interface UpdateActionItemInput {
  title?: string;
  description?: string;
  ownerId?: string;
  deadline?: string;
  status?: ActionItem['status'];
}

export function useActionItems(violationId: string): UseActionItemsResult {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ActionItem[]>(`/violations/${violationId}/action-items`);
      setItems(res);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [violationId]);

  const create = useCallback(
    async (input: CreateActionItemInput) => {
      await api.post(`/violations/${violationId}/action-items`, input);
      await refresh();
    },
    [violationId, refresh],
  );

  const update = useCallback(
    async (actionItemId: string, input: UpdateActionItemInput) => {
      await api.patch(`/violations/${violationId}/action-items/${actionItemId}`, input);
      await refresh();
    },
    [violationId, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh, create, update };
}
