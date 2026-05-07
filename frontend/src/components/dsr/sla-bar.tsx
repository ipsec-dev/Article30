interface SLABarProps {
  deadline: string | Date;
  startedAt: string | Date;
  now?: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

function formatShort(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function SLABar({ deadline, startedAt, now }: SLABarProps) {
  const start = toDate(startedAt);
  const end = toDate(deadline);
  const current = now ?? new Date();

  const totalMs = Math.max(1, end.getTime() - start.getTime());
  const elapsedMs = current.getTime() - start.getTime();
  const remainingMs = end.getTime() - current.getTime();
  const overdue = remainingMs < 0;

  const pct = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
  const fillPct = overdue ? 100 : pct;

  const remainingDays = Math.ceil(remainingMs / DAY_MS);
  const overdueDays = overdue ? Math.ceil(-remainingMs / DAY_MS) : 0;
  const remainingFraction = remainingMs / totalMs;

  const colorVar = overdue
    ? 'var(--danger)'
    : remainingFraction > 0.5
      ? 'var(--success)'
      : remainingFraction > 0.2
        ? 'var(--warn)'
        : 'var(--danger)';

  const headlineColor = overdue || remainingFraction <= 0.2 ? 'var(--danger)' : 'var(--ink)';

  const headline = overdue
    ? `Dépassé de ${overdueDays} jour${overdueDays > 1 ? 's' : ''}`
    : `${remainingDays} jour${remainingDays > 1 ? 's' : ''} restant${remainingDays > 1 ? 's' : ''}`;

  return (
    <div role="group" aria-label="Échéance SLA">
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="font-semibold" style={{ color: headlineColor }}>
          {headline}
        </span>
        <span className="num font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {formatShort(start)} → {formatShort(end)}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--surface-2)' }}
      >
        <div
          data-fill
          className="h-full transition-all"
          style={{ width: `${fillPct}%`, background: colorVar }}
        />
      </div>
    </div>
  );
}
