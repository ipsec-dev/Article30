interface HashSealProps {
  short: string;
}

export function HashSeal({ short }: HashSealProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[10.5px]"
      style={{ color: 'var(--ink-3)' }}
      title="Sceau d'audit (HMAC chaîné)"
    >
      <span
        aria-hidden="true"
        className="hash-chain inline-block size-3"
        style={{ color: 'var(--ink-3)' }}
      />
      {short}
    </span>
  );
}
