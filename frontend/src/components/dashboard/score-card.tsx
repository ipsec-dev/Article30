import { Donut } from '@/components/a30/donut';
import { MiniBars, type MiniBarDatum } from '@/components/a30/mini-bars';

interface FreshnessSlice {
  validated: number;
  total: number;
}

interface ChecklistSlice {
  answered: number;
  total: number;
}

interface ScoreSnapshot {
  id: string;
  score: number;
  snapshotDate: string;
}

interface ScoreCardProps {
  score: number;
  checklist: ChecklistSlice;
  freshness: FreshnessSlice | null;
  totalViolations: number;
  snapshots: ScoreSnapshot[];
}

const TIMELINE_MONTHS = 12;

function monthLabel(d: string): string {
  const m = new Date(d).toLocaleDateString('fr-FR', { month: 'short' });
  return m.replace('.', '');
}

function buildTimeline(snapshots: ScoreSnapshot[]): MiniBarDatum[] {
  const sorted = [...snapshots]
    .sort((a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime())
    .slice(-TIMELINE_MONTHS);
  return sorted.map(s => ({ m: monthLabel(s.snapshotDate), v: s.score }));
}

function computeDelta(timeline: MiniBarDatum[]): number | null {
  if (timeline.length < 2) return null;
  return timeline[timeline.length - 1].v - timeline[0].v;
}

function deltaColor(delta: number): string {
  if (delta > 0) return 'var(--success)';
  if (delta < 0) return 'var(--danger)';
  return 'var(--ink-3)';
}

function deltaLabel(delta: number): string {
  if (delta > 0) return `+${delta} pts`;
  if (delta < 0) return `${delta} pts`;
  return '±0 pts';
}

function freshnessPercent(slice: FreshnessSlice | null): string {
  if (!slice || slice.total === 0) return '—';
  return `${Math.round((slice.validated / slice.total) * 100)}%`;
}

export function ScoreCard({
  score,
  checklist,
  freshness,
  totalViolations,
  snapshots,
}: ScoreCardProps) {
  const timeline = buildTimeline(snapshots);
  const delta = computeDelta(timeline);
  const violationsColor = totalViolations === 0 ? 'var(--success)' : 'var(--ink)';
  const freshnessLabel = freshnessPercent(freshness);

  return (
    <div className="a30-card relative p-6" role="region" aria-label="Score de conformité">
      <div className="mb-1 text-[11px]" style={{ color: 'var(--ink-3)' }}>
        Score de conformité
      </div>
      <div className="flex items-center gap-5">
        <Donut value={score} size={108} stroke={9} />
        <div className="flex-1">
          {timeline.length > 0 ? (
            <>
              <div className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                Tendance 12 mois
              </div>
              {delta !== null && (
                <div className="text-[15px] font-semibold" style={{ color: deltaColor(delta) }}>
                  {deltaLabel(delta)}
                </div>
              )}
              <MiniBars data={timeline} height={42} />
              <div
                className="mt-1.5 flex justify-between text-[10px]"
                style={{ color: 'var(--ink-4)' }}
              >
                <span>{timeline[0].m}</span>
                <span>{timeline[timeline.length - 1].m}</span>
              </div>
            </>
          ) : (
            <div className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
              Pas encore d&apos;historique disponible.
            </div>
          )}
        </div>
      </div>
      <div
        className="mt-4 grid grid-cols-3 gap-3 pt-4 text-[11.5px]"
        style={{ borderTop: '1px solid var(--a30-border)', color: 'var(--ink-3)' }}
      >
        <div>
          <div className="mb-0.5 text-[10px] uppercase tracking-wide">Checklist</div>
          <span className="num text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
            {checklist.answered}
            <span style={{ color: 'var(--ink-3)' }}>/{checklist.total}</span>
          </span>
        </div>
        <div>
          <div className="mb-0.5 text-[10px] uppercase tracking-wide">Fraîcheur</div>
          <span className="num text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
            {freshnessLabel}
          </span>
        </div>
        <div>
          <div className="mb-0.5 text-[10px] uppercase tracking-wide">Violations</div>
          <span className="num text-[14px] font-semibold" style={{ color: violationsColor }}>
            {totalViolations}
          </span>
        </div>
      </div>
    </div>
  );
}
