'use client';

import { type ViolationStateMachineStatus } from '@article30/shared';
import { useI18n } from '@/i18n/context';

const STATE_ORDER: ViolationStateMachineStatus[] = [
  'RECEIVED',
  'TRIAGED',
  'ASSESSED',
  'CONTAINED',
  'NOTIFICATION_PENDING',
  'NOTIFIED_CNIL',
  'PERSONS_NOTIFIED',
  'REMEDIATED',
  'CLOSED',
];

const TERMINAL_BRANCHES: ViolationStateMachineStatus[] = [
  'DISMISSED',
  'PERSONS_NOTIFICATION_WAIVED',
  'REOPENED',
];

interface StateStripProps {
  current: ViolationStateMachineStatus;
}

export function StateStrip({ current }: StateStripProps) {
  const { t } = useI18n();
  const currentIndex = STATE_ORDER.indexOf(current);
  return (
    <div className="space-y-2">
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {STATE_ORDER.map((s, i) => {
          const isCurrent = s === current;
          const isPast = i < currentIndex;
          const style = isCurrent
            ? { background: 'var(--primary-600)', color: '#fff' }
            : isPast
              ? { background: 'var(--primary-100)', color: 'var(--primary-700)' }
              : { background: 'var(--surface-2)', color: 'var(--ink-3)' };
          return (
            <li key={s} className="rounded px-2 py-1" style={style}>
              {t(`violation.state.${s}`)}
            </li>
          );
        })}
      </ol>
      {TERMINAL_BRANCHES.includes(current) && (
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          {t('violation.workflow.branchPrefix')}: {t(`violation.state.${current}`)}
        </p>
      )}
    </div>
  );
}
