'use client';

import { useState } from 'react';
import { useComments } from '@/lib/follow-up';
import { useI18n } from '@/i18n/context';
import type { EntityType } from '@/lib/follow-up';
import { Button } from '@/components/ui/button';

export function CommentsTab({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const { t } = useI18n();
  const { comments, loading, error, post } = useComments(entityType, entityId);
  const [body, setBody] = useState('');
  const [auditorVisible, setAuditorVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading)
    return (
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        {t('followUp.comments.loading')}
      </p>
    );
  if (error)
    return (
      <p className="text-sm text-red-600">
        {t('common.error')}: {error.message}
      </p>
    );

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {comments.map(c => (
          <li
            key={c.id}
            className="rounded px-3 py-2 text-sm"
            style={{ borderWidth: '1px', borderColor: 'var(--a30-border)' }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium" style={{ color: 'var(--ink)' }}>
                {c.authorId}
              </span>
              <span className="text-xs" style={{ color: 'var(--ink-2)' }}>
                {new Date(c.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
            {c.visibility === 'AUDITOR_VISIBLE' && (
              <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                {t('followUp.comments.auditorVisible')}
              </span>
            )}
          </li>
        ))}
        {comments.length === 0 && (
          <li className="text-sm" style={{ color: 'var(--ink-3)' }}>
            {t('followUp.comments.empty')}
          </li>
        )}
      </ul>
      <form
        className="space-y-2"
        onSubmit={async e => {
          e.preventDefault();
          if (!body.trim()) return;
          setSubmitting(true);
          try {
            await post(body, auditorVisible ? 'AUDITOR_VISIBLE' : 'INTERNAL');
            setBody('');
            setAuditorVisible(false);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <textarea
          className="w-full rounded px-3 py-2 text-sm"
          style={{ borderWidth: '1px', borderColor: 'var(--a30-border)' }}
          rows={3}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={t('followUp.comments.placeholder')}
          disabled={submitting}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-2)' }}>
            <input
              type="checkbox"
              checked={auditorVisible}
              onChange={e => setAuditorVisible(e.target.checked)}
              disabled={submitting}
            />
            {t('followUp.comments.auditorVisible')}
          </label>
          <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
            {t('followUp.comments.post')}
          </Button>
        </div>
      </form>
    </div>
  );
}
