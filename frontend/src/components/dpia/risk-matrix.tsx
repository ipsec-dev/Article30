type Level = 'low' | 'medium' | 'high';

const LEVELS: Level[] = ['low', 'medium', 'high'];
const LEVEL_INDEX: Record<Level, number> = { low: 0, medium: 1, high: 2 };
const LEVEL_LABEL: Record<Level, string> = { low: 'Faible', medium: 'Moyen', high: 'Élevé' };

interface RiskMatrixProps {
  selectedLikelihood?: Level;
  selectedSeverity?: Level;
  onChange?: (likelihood: Level, severity: Level) => void;
  ariaLabel?: string;
}

function riskClass(likelihood: Level, severity: Level): 'low' | 'medium' | 'high' {
  const sum = LEVEL_INDEX[likelihood] + LEVEL_INDEX[severity];
  if (sum >= 3) return 'high';
  if (sum >= 1) return 'medium';
  return 'low';
}

const CELL_BG: Record<'low' | 'medium' | 'high', string> = {
  low: 'var(--success-bg)',
  medium: 'var(--warn-bg)',
  high: 'var(--danger-bg)',
};

const CELL_FG: Record<'low' | 'medium' | 'high', string> = {
  low: 'var(--success)',
  medium: 'var(--warn)',
  high: 'var(--danger)',
};

export function RiskMatrix({
  selectedLikelihood,
  selectedSeverity,
  onChange,
  ariaLabel = 'Matrice de risques',
}: RiskMatrixProps) {
  // Render rows from highest to lowest likelihood (top to bottom)
  const rows: Level[] = [...LEVELS].reverse();
  const columns: Level[] = LEVELS;

  return (
    <div role="grid" aria-label={ariaLabel} className="a30-card overflow-hidden">
      <div
        className="grid"
        style={{
          gridTemplateColumns: '110px repeat(3, 1fr)',
        }}
      >
        {/* Header row: empty + severity labels */}
        <div
          className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-3)' }}
        >
          Vraisemblance ↓
        </div>
        {columns.map(sev => (
          <div
            key={`col-${sev}`}
            className="px-3 py-2 text-center text-[11px] font-semibold"
            style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}
          >
            {LEVEL_LABEL[sev]}
          </div>
        ))}
        {/* Body rows */}
        {rows.map(lik => (
          <RowFragment
            key={lik}
            likelihood={lik}
            columns={columns}
            selectedLikelihood={selectedLikelihood}
            selectedSeverity={selectedSeverity}
            onChange={onChange}
          />
        ))}
      </div>
      <div
        className="px-3 py-2 text-center text-[10.5px] font-semibold uppercase tracking-wide"
        style={{
          background: 'var(--surface-2)',
          color: 'var(--ink-3)',
          borderTop: '1px solid var(--a30-border)',
        }}
      >
        Gravité →
      </div>
    </div>
  );
}

interface RowProps {
  likelihood: Level;
  columns: Level[];
  selectedLikelihood?: Level;
  selectedSeverity?: Level;
  onChange?: (likelihood: Level, severity: Level) => void;
}

function RowFragment({
  likelihood,
  columns,
  selectedLikelihood,
  selectedSeverity,
  onChange,
}: RowProps) {
  return (
    <>
      <div
        className="flex items-center px-3 py-3 text-[11px] font-semibold uppercase tracking-wide"
        style={{
          background: 'var(--surface-2)',
          color: 'var(--ink-2)',
          borderTop: '1px solid var(--a30-border)',
        }}
      >
        {LEVEL_LABEL[likelihood]}
      </div>
      {columns.map(sev => {
        const cls = riskClass(likelihood, sev);
        const selected = selectedLikelihood === likelihood && selectedSeverity === sev;
        return (
          <button
            key={`${likelihood}-${sev}`}
            type="button"
            role="gridcell"
            aria-selected={selected}
            data-likelihood={likelihood}
            data-severity={sev}
            onClick={() => onChange?.(likelihood, sev)}
            className="relative flex h-16 items-center justify-center text-[11.5px] font-medium transition-colors"
            style={{
              background: CELL_BG[cls],
              color: CELL_FG[cls],
              borderTop: '1px solid var(--a30-border)',
              borderLeft: '1px solid var(--a30-border)',
              outline: selected ? '2px solid var(--primary)' : 'none',
              outlineOffset: selected ? -2 : 0,
            }}
          >
            {LEVEL_LABEL[cls === 'low' ? 'low' : cls === 'high' ? 'high' : 'medium']}
          </button>
        );
      })}
    </>
  );
}
