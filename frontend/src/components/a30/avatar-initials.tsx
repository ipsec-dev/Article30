interface AvatarInitialsProps {
  // Accepts undefined/null defensively — UserDto declares `name: string` but
  // the /auth/me payload sometimes omits it depending on backend shape.
  name: string | null | undefined;
  size?: number;
}

export function AvatarInitials({ name, size = 28 }: AvatarInitialsProps) {
  const initials = (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <div
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full font-semibold tabular-nums"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: 'var(--primary-50)',
        color: 'var(--primary-600)',
      }}
    >
      {initials}
    </div>
  );
}
