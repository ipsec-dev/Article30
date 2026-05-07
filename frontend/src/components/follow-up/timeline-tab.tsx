'use client';

import { useTimeline } from '@/lib/follow-up';
import { useI18n } from '@/i18n/context';
import type { EntityType } from '@/lib/follow-up';

export function TimelineTab({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const { t } = useI18n();
  const { events, loading, error } = useTimeline(entityType, entityId);
  if (loading)
    return (
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        {t('followUp.timeline.loading')}
      </p>
    );
  if (error)
    return (
      <p className="text-sm text-red-600">
        {t('common.error')}: {error.message}
      </p>
    );
  if (events.length === 0)
    return (
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        {t('followUp.timeline.empty')}
      </p>
    );
  return (
    <ol className="space-y-2">
      {events.map(e => (
        <li
          key={e.id}
          className="rounded px-3 py-2 text-sm"
          style={{ borderWidth: '1px', borderColor: 'var(--a30-border)' }}
        >
          <span className="font-medium" style={{ color: 'var(--ink)' }}>
            {e.kind}
          </span>
          <span className="ml-2" style={{ color: 'var(--ink-2)' }}>
            {new Date(e.performedAt).toLocaleString()}
          </span>
        </li>
      ))}
    </ol>
  );
}
