'use client';

import { useRef } from 'react';
import { useAttachments } from '@/lib/follow-up';
import { useI18n } from '@/i18n/context';
import type { EntityType } from '@/lib/follow-up';
import { Button } from '@/components/ui/button';

export function AttachmentsTab({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const { t } = useI18n();
  const { attachments, loading, error, upload, downloadUrl } = useAttachments(entityType, entityId);
  const fileRef = useRef<HTMLInputElement>(null);

  if (loading)
    return (
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        {t('followUp.attachments.loading')}
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
        {attachments.map(a => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded px-3 py-2 text-sm"
            style={{ borderWidth: '1px', borderColor: 'var(--a30-border)' }}
          >
            <span>{a.filename}</span>
            <a
              className="text-xs hover:underline"
              style={{ color: 'var(--primary-text)' }}
              href={downloadUrl(a.id)}
            >
              {t('followUp.attachments.download')}
            </a>
          </li>
        ))}
        {attachments.length === 0 && (
          <li className="text-sm" style={{ color: 'var(--ink-3)' }}>
            {t('followUp.attachments.empty')}
          </li>
        )}
      </ul>
      <form
        className="flex items-center gap-2"
        onSubmit={async e => {
          e.preventDefault();
          const file = fileRef.current?.files?.[0];
          if (!file) return;
          await upload(file, 'EVIDENCE');
          if (fileRef.current) fileRef.current.value = '';
        }}
      >
        <input ref={fileRef} type="file" className="text-sm" />
        <Button type="submit" size="sm">
          {t('followUp.attachments.upload')}
        </Button>
      </form>
    </div>
  );
}
