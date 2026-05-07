import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Comment, EntityType } from './types';

export interface UseCommentsResult {
  comments: Comment[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  post: (body: string, visibility?: Comment['visibility']) => Promise<void>;
}

export function useComments(entityType: EntityType, entityId: string): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Comment[]>(`/follow-up/comments/${entityType}/${entityId}`);
      setComments(res);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  const post = useCallback(
    async (body: string, visibility: Comment['visibility'] = 'INTERNAL') => {
      await api.post('/follow-up/comments', { entityType, entityId, body, visibility });
      await refresh();
    },
    [entityType, entityId, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { comments, loading, error, refresh, post };
}
