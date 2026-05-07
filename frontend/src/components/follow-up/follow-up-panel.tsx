'use client';

import { useState } from 'react';
import type { EntityType } from '@/lib/follow-up';
import { useI18n } from '@/i18n/context';
import { TimelineTab } from './timeline-tab';
import { CommentsTab } from './comments-tab';
import { AttachmentsTab } from './attachments-tab';

type Tab = 'timeline' | 'comments' | 'attachments';

export function FollowUpPanel({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<Tab>('timeline');

  return (
    <section
      className="mt-6 rounded-lg"
      style={{
        borderWidth: '1px',
        borderColor: 'var(--a30-border)',
        backgroundColor: 'var(--surface)',
      }}
    >
      <header
        className="flex text-sm"
        style={{ borderBottomWidth: '1px', borderBottomColor: 'var(--a30-border)' }}
      >
        <TabButton active={active === 'timeline'} onClick={() => setActive('timeline')}>
          {t('followUp.timeline.tab')}
        </TabButton>
        <TabButton active={active === 'comments'} onClick={() => setActive('comments')}>
          {t('followUp.comments.tab')}
        </TabButton>
        <TabButton active={active === 'attachments'} onClick={() => setActive('attachments')}>
          {t('followUp.attachments.tab')}
        </TabButton>
      </header>
      <div className="p-4">
        {active === 'timeline' && <TimelineTab entityType={entityType} entityId={entityId} />}
        {active === 'comments' && <CommentsTab entityType={entityType} entityId={entityId} />}
        {active === 'attachments' && <AttachmentsTab entityType={entityType} entityId={entityId} />}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const cls = 'border-b-2 px-4 py-2';
  const activeStyle = active
    ? { borderBottomColor: 'var(--primary-text)', fontWeight: 'bold', color: 'var(--primary-text)' }
    : { borderBottomColor: 'transparent', color: 'var(--ink-2)' };
  const style = { ...activeStyle, ...(active ? {} : { cursor: 'pointer' }) };
  return (
    <button
      type="button"
      className={cls}
      style={style}
      onClick={onClick}
      onMouseEnter={!active ? e => (e.currentTarget.style.color = 'var(--ink)') : undefined}
      onMouseLeave={!active ? e => (e.currentTarget.style.color = 'var(--ink-2)') : undefined}
    >
      {children}
    </button>
  );
}
