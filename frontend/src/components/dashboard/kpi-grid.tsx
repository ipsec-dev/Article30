import Link from 'next/link';
import { BookOpen, Building2, Inbox, Rss } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KpiGridProps {
  treatments: {
    validated: number;
    total: number;
    draft: number;
    needsReview: number;
  };
  dsr: {
    open: number;
    overdue: number;
  };
  regulatoryNewCount: number;
  vendorAlerts: number;
}

interface TileProps {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
}

function Tile({ href, icon: Icon, label, value, sub, valueColor }: TileProps) {
  return (
    <Link
      href={href}
      className="a30-card flex flex-col gap-2 p-5 transition-colors hover:border-[var(--primary)]"
    >
      <div
        className="flex items-center gap-2 text-[11px] uppercase tracking-wide"
        style={{ color: 'var(--ink-3)' }}
      >
        <Icon aria-hidden="true" className="size-3.5" />
        <span>{label}</span>
      </div>
      <div
        className="num text-[24px] font-semibold leading-none"
        style={{ color: valueColor ?? 'var(--ink)' }}
      >
        {value}
      </div>
      <div className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
        {sub}
      </div>
    </Link>
  );
}

export function KpiGrid({ treatments, dsr, regulatoryNewCount, vendorAlerts }: KpiGridProps) {
  const overdueColor = dsr.overdue > 0 ? 'var(--warn)' : 'var(--ink)';
  const regulatoryColor = regulatoryNewCount > 0 ? 'var(--info)' : 'var(--ink-3)';
  const vendorColor = vendorAlerts > 0 ? 'var(--danger)' : 'var(--success)';
  const vendorSub = vendorAlerts > 0 ? `alertes DPA` : 'tous à jour';

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Tile
        href="/register"
        icon={BookOpen}
        label="Traitements validés"
        value={`${treatments.validated} / ${treatments.total}`}
        sub={`${treatments.draft} brouillons · ${treatments.needsReview} à revoir`}
      />
      <Tile
        href="/dsr"
        icon={Inbox}
        label="Demandes ouvertes"
        value={String(dsr.open)}
        sub={`${dsr.overdue} en retard`}
        valueColor={overdueColor}
      />
      <Tile
        href="/regulatory-updates"
        icon={Rss}
        label="Veille à examiner"
        value={String(regulatoryNewCount)}
        sub="depuis CNIL & EDPB"
        valueColor={regulatoryColor}
      />
      <Tile
        href="/vendors"
        icon={Building2}
        label="Sous-traitants"
        value={String(vendorAlerts)}
        sub={vendorSub}
        valueColor={vendorColor}
      />
    </div>
  );
}
