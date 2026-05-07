import { Donut } from '@/components/a30/donut';

interface SectionProgress {
  key: string;
  label: string;
  answered: number;
  total: number;
}

interface ChecklistScoreProps {
  score: number;
  answered: number;
  total: number;
  sections: SectionProgress[];
}

function pct(answered: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((answered / total) * 100);
}

function colorFor(p: number): string {
  if (p >= 80) return 'var(--success)';
  if (p >= 50) return 'var(--warn)';
  return 'var(--danger)';
}

export function ChecklistScore({ score, answered, total, sections }: ChecklistScoreProps) {
  return (
    <div className="a30-card overflow-hidden" role="region" aria-label="Score de conformité">
      <div className="flex items-center gap-5 px-5 py-5">
        <Donut value={score} size={96} stroke={9} />
        <div>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
            Conformité globale
          </div>
          <div className="num text-[20px] font-semibold" style={{ color: 'var(--ink)' }}>
            {answered} <span style={{ color: 'var(--ink-3)' }}>/ {total}</span>
          </div>
          <div className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
            questions répondues
          </div>
        </div>
      </div>
      {sections.length > 0 && (
        <div style={{ borderTop: '1px solid var(--a30-border)' }}>
          <ul>
            {sections.map((section, i) => {
              const p = pct(section.answered, section.total);
              return (
                <li
                  key={section.key}
                  className="flex items-center gap-4 px-5 py-3"
                  style={{ borderTop: i ? '1px solid var(--a30-border)' : 'none' }}
                >
                  <div
                    className="min-w-0 flex-1 truncate text-[13px] font-medium"
                    style={{ color: 'var(--ink)' }}
                  >
                    {section.label}
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-1.5 w-32 overflow-hidden rounded-full"
                      style={{ background: 'var(--surface-2)' }}
                    >
                      <div
                        data-fill
                        className="h-full transition-all"
                        style={{ width: `${p}%`, background: colorFor(p) }}
                      />
                    </div>
                    <span
                      className="num w-16 text-right text-[11.5px] font-semibold"
                      style={{ color: 'var(--ink-2)' }}
                    >
                      {section.answered} / {section.total}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
