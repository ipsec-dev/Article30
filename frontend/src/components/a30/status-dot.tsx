import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatusKind = 'success' | 'warn' | 'danger' | 'info' | 'neutral' | 'primary';

const COLOR_VAR: Record<StatusKind, string> = {
  success: 'var(--success)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  info: 'var(--info)',
  neutral: 'var(--ink-3)',
  primary: 'var(--primary)',
};

interface StatusDotProps {
  kind?: StatusKind;
  mono?: boolean;
  children: ReactNode;
}

export function StatusDot({ kind = 'neutral', mono = false, children }: StatusDotProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-2 text-[12px]', mono && 'font-mono')}
      style={{ color: 'var(--ink-2)' }}
    >
      <span
        aria-hidden="true"
        className="inline-block size-2 rounded-full"
        style={{ background: COLOR_VAR[kind] }}
      />
      {children}
    </span>
  );
}
