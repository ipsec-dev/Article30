'use client';

import { useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/dates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RssFeedDto } from '@article30/shared';

type FeedRowProps = Readonly<{
  feed: RssFeedDto;
  t: (key: string) => string;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}>;

function FeedRow({ feed, t, onToggle, onDelete }: FeedRowProps) {
  const handleToggle = useCallback(() => {
    onToggle(feed.id, feed.enabled);
  }, [feed.id, feed.enabled, onToggle]);

  const handleDelete = useCallback(() => {
    onDelete(feed.id);
  }, [feed.id, onDelete]);

  let pillClass = 'bg-[var(--surface-2)] text-[var(--ink-3)]';
  if (feed.enabled) {
    pillClass = 'bg-green-100 text-green-700';
  }

  let toggleLabel = 'OFF';
  if (feed.enabled) {
    toggleLabel = 'ON';
  }

  let lastSyncText;
  if (feed.lastSyncAt) {
    lastSyncText = formatDate(feed.lastSyncAt);
  } else {
    lastSyncText = t('settings.feedNeverSynced');
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 font-medium">{feed.label}</td>
      <td className="py-2 pr-4 max-w-[200px] truncate" style={{ color: 'var(--ink-3)' }}>
        <span title={feed.url}>{feed.url}</span>
      </td>
      <td className="py-2 pr-4">
        <button
          onClick={handleToggle}
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pillClass}`}
        >
          {toggleLabel}
        </button>
      </td>
      <td className="py-2 pr-4" style={{ color: 'var(--ink-3)' }}>
        {lastSyncText}
      </td>
      <td className="py-2">
        <button
          onClick={handleDelete}
          className="hover:text-red-500 transition-colors"
          style={{ color: 'var(--ink-3)' }}
          aria-label="Delete feed"
        >
          <Trash2 className="size-4" />
        </button>
      </td>
    </tr>
  );
}

type RssFeedsCardProps = Readonly<{
  feeds: RssFeedDto[];
  newFeedLabel: string;
  newFeedUrl: string;
  addingFeed: boolean;
  feedMessage: string | null;
  feedMessageClass: string;
  addFeedLabel: string;
  onNewFeedLabelChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNewFeedUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddFeed: () => void;
  onToggleFeed: (id: string, enabled: boolean) => void;
  onDeleteFeed: (id: string) => void;
  t: (key: string) => string;
}>;

export function RssFeedsCard({
  feeds,
  newFeedLabel,
  newFeedUrl,
  addingFeed,
  feedMessage,
  feedMessageClass,
  addFeedLabel,
  onNewFeedLabelChange,
  onNewFeedUrlChange,
  onAddFeed,
  onToggleFeed,
  onDeleteFeed,
  t,
}: RssFeedsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.rssFeeds')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm" style={{ color: 'var(--ink-2)' }}>
          {t('settings.rssFeedsDescription')}
        </p>

        {feeds.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b text-left text-xs font-medium uppercase"
                  style={{ color: 'var(--ink-3)' }}
                >
                  <th className="pb-2 pr-4">{t('settings.feedLabel')}</th>
                  <th className="pb-2 pr-4">{t('settings.feedUrl')}</th>
                  <th className="pb-2 pr-4">{t('settings.feedEnabled')}</th>
                  <th className="pb-2 pr-4">{t('settings.feedLastSync')}</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {feeds.map(feed => (
                  <FeedRow
                    key={feed.id}
                    feed={feed}
                    t={t}
                    onToggle={onToggleFeed}
                    onDelete={onDeleteFeed}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="newFeedLabel">{t('settings.feedLabel')}</Label>
            <Input
              id="newFeedLabel"
              value={newFeedLabel}
              onChange={onNewFeedLabelChange}
              placeholder="CNIL"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newFeedUrl">{t('settings.feedUrl')}</Label>
            <Input
              id="newFeedUrl"
              type="url"
              value={newFeedUrl}
              onChange={onNewFeedUrlChange}
              placeholder="https://example.com/feed.xml"
            />
          </div>

          {feedMessage && <p className={`text-sm ${feedMessageClass}`}>{feedMessage}</p>}

          <Button onClick={onAddFeed} disabled={addingFeed || !newFeedLabel || !newFeedUrl}>
            {addFeedLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
