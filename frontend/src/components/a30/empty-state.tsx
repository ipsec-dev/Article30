import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  body: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="a30-card px-6 py-12 text-center" style={{ borderStyle: 'dashed' }}>
      <div className="mb-1 text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
        {title}
      </div>
      <div className="mx-auto mb-4 max-w-md text-[13px]" style={{ color: 'var(--ink-3)' }}>
        {body}
      </div>
      {action}
    </div>
  );
}
