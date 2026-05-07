'use client';

import { type DsrStateMachineStatus } from '@article30/shared';
import { useI18n } from '@/i18n/context';

const STATE_ORDER: DsrStateMachineStatus[] = [
  'RECEIVED',
  'ACKNOWLEDGED',
  'IDENTITY_VERIFIED',
  'IN_PROGRESS',
  'RESPONDED',
  'CLOSED',
];

const TERMINAL_BRANCHES: DsrStateMachineStatus[] = [
  'AWAITING_REQUESTER',
  'PARTIALLY_FULFILLED',
  'REJECTED',
  'WITHDRAWN',
];

interface StateStripProps {
  current: DsrStateMachineStatus;
}

export function DsrStateStrip({ current }: StateStripProps) {
  const { t } = useI18n();
  const currentIndex = STATE_ORDER.indexOf(current);
  return (
    <div className="space-y-2">
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {STATE_ORDER.map((s, i) => {
          const isCurrent = s === current;
          const isPast = currentIndex !== -1 && i < currentIndex;
          let style: React.CSSProperties;
          if (isCurrent) {
            style = { background: 'var(--primary)', color: '#fff' };
          } else if (isPast) {
            style = { background: 'var(--primary-subtle)', color: 'var(--primary-fg)' };
          } else {
            style = { background: 'var(--surface-2)', color: 'var(--ink-3)' };
          }
          return (
            <li key={s} className="rounded px-2 py-1" style={style}>
              {t(`dsr.state.${s}`)}
            </li>
          );
        })}
      </ol>
      {TERMINAL_BRANCHES.includes(current) && (
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          {t('dsr.workflow.branchPrefix')}: {t(`dsr.state.${current}`)}
        </p>
      )}
    </div>
  );
}
