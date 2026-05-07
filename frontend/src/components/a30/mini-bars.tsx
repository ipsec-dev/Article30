export interface MiniBarDatum {
  m: string;
  v: number;
}

interface MiniBarsProps {
  data: MiniBarDatum[];
  height?: number;
}

export function MiniBars({ data, height = 56 }: MiniBarsProps) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div aria-hidden="true" className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d.v / max) * 100;
        const isLast = i === data.length - 1;
        return (
          <div key={d.m + i} className="flex flex-1 flex-col items-center gap-1">
            <div
              data-bar
              className="w-full"
              style={{
                height: `${pct}%`,
                background: isLast ? 'var(--primary)' : 'var(--a30-accent)',
                opacity: isLast ? 1 : 0.65,
                borderRadius: '2px 2px 0 0',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
