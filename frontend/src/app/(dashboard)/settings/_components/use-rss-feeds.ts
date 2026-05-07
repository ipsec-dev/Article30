'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { RssFeedDto } from '@article30/shared';

const SETTINGS_SAVE_SUCCESS_KEY = 'settings.saveSuccess';
const SETTINGS_SAVE_ERROR_KEY = 'settings.saveError';

type Translate = (key: string) => string;

export function useRssFeeds(t: Translate) {
  const [feeds, setFeeds] = useState<RssFeedDto[]>([]);
  const [newFeedLabel, setNewFeedLabel] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [addingFeed, setAddingFeed] = useState(false);
  const [feedMessage, setFeedMessage] = useState<string | null>(null);

  const fetchFeeds = useCallback(async () => {
    try {
      const data = await api.get<RssFeedDto[]>('/rss-feeds');
      setFeeds(data);
    } catch {
      /* silently fail */
    }
  }, []);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  const handleAddFeed = useCallback(async () => {
    if (!newFeedLabel || !newFeedUrl) {
      return;
    }
    setAddingFeed(true);
    setFeedMessage(null);
    try {
      await api.post('/rss-feeds', { label: newFeedLabel, url: newFeedUrl });
      setNewFeedLabel('');
      setNewFeedUrl('');
      await fetchFeeds();
      setFeedMessage(t(SETTINGS_SAVE_SUCCESS_KEY));
    } catch {
      setFeedMessage(t(SETTINGS_SAVE_ERROR_KEY));
    } finally {
      setAddingFeed(false);
    }
  }, [newFeedLabel, newFeedUrl, fetchFeeds, t]);

  const handleToggleFeed = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await api.patch(`/rss-feeds/${id}`, { enabled: !enabled });
        await fetchFeeds();
      } catch {
        /* silently fail */
      }
    },
    [fetchFeeds],
  );

  const handleDeleteFeed = useCallback(
    async (id: string) => {
      if (!confirm(t('settings.feedDeleteConfirm'))) {
        return;
      }
      try {
        await api.delete(`/rss-feeds/${id}`);
        await fetchFeeds();
      } catch {
        /* silently fail */
      }
    },
    [t, fetchFeeds],
  );

  const handleNewFeedLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewFeedLabel(e.target.value);
  }, []);

  const handleNewFeedUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewFeedUrl(e.target.value);
  }, []);

  return {
    feeds,
    newFeedLabel,
    newFeedUrl,
    addingFeed,
    feedMessage,
    handleAddFeed,
    handleToggleFeed,
    handleDeleteFeed,
    handleNewFeedLabelChange,
    handleNewFeedUrlChange,
  };
}
