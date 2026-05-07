import { Eye, Pen } from 'lucide-react';
import { Role } from '@article30/shared';

interface RoleBannerProps {
  role: Role;
}

export function RoleBanner({ role }: RoleBannerProps) {
  if (role === Role.ADMIN) return null;
  const isAuditor = role === Role.AUDITOR;
  const Icon = isAuditor ? Eye : Pen;
  const label = isAuditor
    ? 'Mode Auditeur — accès lecture seule pour revue de conformité.'
    : 'Mode Éditeur — vous pouvez modifier les traitements mais pas les valider.';
  return (
    <div
      role="status"
      className="flex items-center gap-2 px-6 py-2 text-[12px] lg:px-10"
      style={{
        background: isAuditor ? 'var(--warn-bg)' : 'var(--info-bg)',
        color: isAuditor ? 'var(--warn)' : 'var(--info)',
        borderBottom: '1px solid var(--a30-border)',
      }}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      <span className="font-medium">{label}</span>
    </div>
  );
}
