'use client';

import type { DsrPause } from '@/lib/dsr/types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface DeadlinePillProps {
  deadline: string;
  status: string;
  pauses: DsrPause[];
}

function computeDaysRemaining(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / MS_PER_DAY);
}

function hasOpenPause(pauses: DsrPause[]): boolean {
  return pauses.some(p => p.resumedAt === null);
}

export function DeadlinePill({ deadline, status, pauses }: DeadlinePillProps) {
  const isClosed = status === 'CLOSED';
  const effectiveDeadline = deadline;
  const daysRemaining = computeDaysRemaining(effectiveDeadline);
  const isOverdue = daysRemaining < 0 && !isClosed;
  const isPaused = hasOpenPause(pauses);

  if (isClosed) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
        style={{ background: 'var(--surface-2)', color: 'var(--ink-3)' }}
      >
        Closed
      </span>
    );
  }

  let pillClass: string;
  let label: string;

  if (isOverdue) {
    pillClass = 'bg-red-100 text-red-700';
    label = `${Math.abs(daysRemaining)} days overdue`;
  } else if (daysRemaining <= 7) {
    pillClass = 'bg-amber-100 text-amber-700';
    label = `${daysRemaining} days remaining`;
  } else {
    pillClass = 'bg-green-100 text-green-700';
    label = `${daysRemaining} days remaining`;
  }

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${pillClass}`}
      >
        {label}
      </span>
      {isPaused && (
        <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
          Paused
        </span>
      )}
    </span>
  );
}
