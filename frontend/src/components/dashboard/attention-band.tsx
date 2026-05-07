import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

const MAX_ROWS = 3;

type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface AttentionAlert {
  type: string;
  severity?: AlertSeverity;
  title?: string;
  subtitle?: string;
  href?: string;
}

interface AttentionBandProps {
  alerts: AttentionAlert[];
  total?: number;
}

const SEVERITY_KIND: Record<AlertSeverity, { bg: string; fg: string; label: string }> = {
  CRITICAL: { bg: 'var(--danger-bg)', fg: 'var(--danger)', label: 'Critique' },
  HIGH: { bg: 'var(--warn-bg)', fg: 'var(--warn)', label: 'Élevé' },
  MEDIUM: { bg: 'var(--info-bg)', fg: 'var(--info)', label: 'Moyen' },
  LOW: { bg: 'var(--surface-2)', fg: 'var(--ink-2)', label: 'Faible' },
};

function severityKey(a: AttentionAlert): AlertSeverity {
  return a.severity ?? 'MEDIUM';
}

function alertTitle(a: AttentionAlert): string {
  return a.title ?? a.type;
}

export function AttentionBand({ alerts, total }: AttentionBandProps) {
  if (alerts.length === 0) return null;
  const rows = alerts.slice(0, MAX_ROWS);
  const count = total ?? alerts.length;

  return (
    <div className="a30-card overflow-hidden" role="region" aria-label="Points d'attention">
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid var(--a30-border)' }}
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle aria-hidden="true" className="size-4" style={{ color: 'var(--warn)' }} />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
            {count} {count > 1 ? "points d'attention" : "point d'attention"}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
            · classés par sévérité
          </span>
        </div>
        <Link
          href="/alerts"
          className="text-[11.5px] font-medium"
          style={{ color: 'var(--primary-600)' }}
        >
          Tout voir →
        </Link>
      </div>
      <ul>
        {rows.map((alert, i) => {
          const kind = SEVERITY_KIND[severityKey(alert)];
          return (
            <li
              key={`${alert.type}-${i}`}
              className="dense-row flex items-center gap-4 px-5"
              style={{ borderTop: i ? '1px solid var(--a30-border)' : 'none' }}
            >
              <span
                className="inline-flex items-center px-2 py-[1px] text-[11.5px] font-medium"
                style={{
                  background: kind.bg,
                  color: kind.fg,
                  border: '1px solid var(--a30-border)',
                  borderRadius: 999,
                }}
              >
                {kind.label}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                  {alertTitle(alert)}
                </div>
                {alert.subtitle && (
                  <div className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                    {alert.subtitle}
                  </div>
                )}
              </div>
              <Link
                href={alert.href ?? '/alerts'}
                className="rounded-md px-3 py-1.5 text-[12px] font-medium"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  border: '1px solid var(--border-2)',
                }}
              >
                Traiter
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
