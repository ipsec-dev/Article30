import Link from 'next/link';
import type { TreatmentDto } from '@article30/shared';
import { TreatmentStatus } from '@article30/shared';
import { StatusDot, type StatusKind } from '@/components/a30/status-dot';
import { EmptyState } from '@/components/a30/empty-state';

const MAX_ROWS = 5;

interface RecentTreatmentsProps {
  treatments: TreatmentDto[];
}

const STATUS_KIND: Record<TreatmentStatus, { kind: 'success' | 'neutral'; label: string }> = {
  [TreatmentStatus.VALIDATED]: { kind: 'success', label: 'Validé' },
  [TreatmentStatus.DRAFT]: { kind: 'neutral', label: 'Brouillon' },
};

const FRESHNESS_KIND: Record<string, { kind: StatusKind; label: string }> = {
  FRESH: { kind: 'success', label: 'À jour' },
  PENDING_REVIEW: { kind: 'warn', label: 'En revue' },
  OUTDATED: { kind: 'danger', label: 'Obsolète' },
};

function freshnessFor(t: TreatmentDto): { kind: StatusKind; label: string } {
  const s = t.indicators?.freshnessStatus;
  if (s && FRESHNESS_KIND[s]) return FRESHNESS_KIND[s];
  return { kind: 'neutral', label: '—' };
}

export function RecentTreatments({ treatments }: RecentTreatmentsProps) {
  if (treatments.length === 0) {
    return (
      <EmptyState
        title="Aucun traitement"
        body="Créez votre premier traitement pour commencer à construire votre registre."
        action={
          <Link
            href="/register"
            className="inline-flex items-center rounded-md px-3 py-2 text-[13px] font-medium"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-fg)',
              border: '1px solid var(--primary-600)',
            }}
          >
            Créer un traitement
          </Link>
        }
      />
    );
  }

  const rows = treatments.slice(0, MAX_ROWS);

  return (
    <div className="a30-card overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid var(--a30-border)' }}
      >
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
          Traitements récents
        </span>
        <Link
          href="/register"
          className="text-[11.5px] font-medium"
          style={{ color: 'var(--primary-600)' }}
        >
          Voir tout →
        </Link>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            <th
              className="px-5 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--ink-3)' }}
            >
              Réf.
            </th>
            <th
              className="px-5 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--ink-3)' }}
            >
              Nom
            </th>
            <th
              className="px-5 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--ink-3)' }}
            >
              Statut
            </th>
            <th
              className="px-5 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--ink-3)' }}
            >
              Fraîcheur
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
            const status = STATUS_KIND[t.status] ?? { kind: 'neutral' as const, label: t.status };
            const freshness = freshnessFor(t);
            return (
              <tr key={t.id} style={{ borderTop: i ? '1px solid var(--a30-border)' : 'none' }}>
                <td className="px-5 py-2.5">
                  <span className="num font-mono text-[12px]" style={{ color: 'var(--ink-3)' }}>
                    {t.refNumber !== null && t.refNumber !== undefined ? `#${t.refNumber}` : '—'}
                  </span>
                </td>
                <td className="px-5 py-2.5">
                  <Link
                    href={`/register/${t.id}`}
                    className="font-medium hover:underline"
                    style={{ color: 'var(--ink)' }}
                  >
                    {t.name}
                  </Link>
                </td>
                <td className="px-5 py-2.5">
                  <StatusDot kind={status.kind}>{status.label}</StatusDot>
                </td>
                <td className="px-5 py-2.5">
                  <StatusDot kind={freshness.kind}>{freshness.label}</StatusDot>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
