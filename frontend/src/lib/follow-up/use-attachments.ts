import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Attachment, EntityType } from './types';

export interface UseAttachmentsResult {
  attachments: Attachment[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  upload: (file: File, category: string) => Promise<void>;
  downloadUrl: (id: string) => string;
}

export function useAttachments(entityType: EntityType, entityId: string): UseAttachmentsResult {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Attachment[]>(`/follow-up/attachments/${entityType}/${entityId}`);
      setAttachments(res);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  const upload = useCallback(
    async (file: File, category: string) => {
      const form = new FormData();
      form.append('file', file);
      form.append('entityType', entityType);
      form.append('entityId', entityId);
      form.append('category', category);
      // Multipart upload bypasses the JSON-serialising api.post — use fetch
      // directly with the existing XSRF cookie.
      const res = await fetch('/api/follow-up/attachments', {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers: { 'x-xsrf-token': getCsrfFromCookie() },
      });
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }
      await refresh();
    },
    [entityType, entityId, refresh],
  );

  const downloadUrl = useCallback((id: string) => `/api/follow-up/attachments/${id}/download`, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { attachments, loading, error, refresh, upload, downloadUrl };
}

function getCsrfFromCookie(): string {
  const match = /(?:^|;\s*)XSRF-TOKEN=([^;]*)/.exec(document.cookie);
  if (!match) return '';
  return decodeURIComponent(match[1]);
}
