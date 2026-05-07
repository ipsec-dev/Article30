interface DonutProps {
  value: number;
  size?: number;
  stroke?: number;
}

export function Donut({ value, size = 96, stroke = 8 }: DonutProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * c;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${clamped} %`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--a30-border)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="num"
        style={{ fontSize: size * 0.28, fontWeight: 600, fill: 'var(--ink)' }}
      >
        {clamped}
        <tspan style={{ fontSize: size * 0.16, fontWeight: 500, fill: 'var(--ink-3)' }}>%</tspan>
      </text>
    </svg>
  );
}
