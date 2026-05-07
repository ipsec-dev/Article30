'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { getMe } from '@/lib/auth';
import { useI18n } from '@/i18n/context';
import { Role, TreatmentStatus } from '@article30/shared';
import type {
  TreatmentDto,
  ChecklistResponseDto,
  UserDto,
  PaginatedResponse,
  DsrStatsDto,
} from '@article30/shared';
import { HeroBand } from '@/components/dashboard/hero-band';
import { ScoreCard } from '@/components/dashboard/score-card';
import { AttentionBand } from '@/components/dashboard/attention-band';
import { KpiGrid } from '@/components/dashboard/kpi-grid';
import { RecentTreatments } from '@/components/dashboard/recent-treatments';

interface ComplianceBreakdown {
  checklist: { score: number; weight: number; answered: number; total: number };
  freshness: { score: number; weight: number; validated: number; total: number };
  violations: {
    score: number;
    weight: number;
    penalties: number;
    openByLevel: Record<string, number>;
  };
}

interface ComplianceScore {
  score: number;
  breakdown: ComplianceBreakdown;
}

interface FineExposure {
  annualTurnover: number | null;
  maxFine: number | null;
  estimatedExposure: number | null;
  complianceScore: number;
}

interface Snapshot {
  id: string;
  score: number;
  snapshotDate: string;
}

interface AlertItem {
  type: string;
  [key: string]: unknown;
}

interface AlertsResult {
  items: AlertItem[];
  summary: { total: number; critical: number; high: number; medium: number };
}

const TREATMENTS_LIMIT = 1000;
const VENDOR_DPA_MISSING = 'VENDOR_DPA_MISSING';
const VENDOR_DPA_EXPIRING = 'VENDOR_DPA_EXPIRING';
const OUTDATED_STATUSES = new Set(['OUTDATED', 'PENDING_REVIEW']);
const VENDOR_ALERT_TYPES = new Set([VENDOR_DPA_MISSING, VENDOR_DPA_EXPIRING]);
const ADMIN_FINE_ROLES = new Set<Role>([Role.ADMIN, Role.DPO, Role.AUDITOR]);

const SPINNER_CLASS =
  'size-8 animate-spin rounded-full border-4 border-[var(--a30-border)] border-t-[var(--primary)]';

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function getGreetingName(user: { firstName?: string; lastName?: string; email?: string }): string {
  const composed = [user.firstName?.trim(), user.lastName?.trim()]
    .filter((part): part is string => Boolean(part))
    .join(' ');
  if (composed) return composed;
  return user.email?.split('@')[0] ?? '';
}

function countByFreshness(treatments: TreatmentDto[], target: string): number {
  return treatments.filter(tr => tr.indicators?.freshnessStatus === target).length;
}

function countOutdated(treatments: TreatmentDto[]): number {
  return treatments.filter(tr => {
    const s = tr.indicators?.freshnessStatus;
    return s !== undefined && OUTDATED_STATUSES.has(s);
  }).length;
}

function countVendorAlerts(alerts: AlertsResult | null): number {
  if (!alerts) return 0;
  return alerts.items.filter(a => VENDOR_ALERT_TYPES.has(a.type)).length;
}

function deriveSeverity(item: AlertItem): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  const raw = (item.severity ?? item.level ?? 'MEDIUM') as string;
  if (raw === 'CRITICAL' || raw === 'HIGH' || raw === 'MEDIUM' || raw === 'LOW') return raw;
  return 'MEDIUM';
}

function mapAlerts(alerts: AlertsResult | null) {
  if (!alerts) return [];
  const mapped = alerts.items.map(item => ({
    type: item.type,
    severity: deriveSeverity(item),
    title: typeof item.title === 'string' ? item.title : undefined,
    subtitle: typeof item.subtitle === 'string' ? item.subtitle : undefined,
  }));
  return mapped.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

function dsrOpenCount(stats: DsrStatsDto | null): number {
  if (!stats) return 0;
  const completed = (stats.byStatus?.['COMPLETED' as never] as number | undefined) ?? 0;
  const rejected = (stats.byStatus?.['REJECTED' as never] as number | undefined) ?? 0;
  return Math.max(0, stats.total - completed - rejected);
}

export default function DashboardPage() {
  const { locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDto | null>(null);
  const [compliance, setCompliance] = useState<ComplianceScore | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [treatments, setTreatments] = useState<TreatmentDto[]>([]);
  const [alerts, setAlerts] = useState<AlertsResult | null>(null);
  const [checklistAnswered, setChecklistAnswered] = useState(0);
  const [dsrStats, setDsrStats] = useState<DsrStatsDto | null>(null);
  const [regulatoryNewCount, setRegulatoryNewCount] = useState(0);

  const isAdmin = user !== null && (user.role === Role.ADMIN || user.role === Role.DPO);

  const handleDownloadReport = useCallback(() => {
    globalThis.open(`/api/compliance/report?locale=${locale}`, '_blank');
  }, [locale]);

  const handleDownloadAuditPackage = useCallback(() => {
    globalThis.open(`/api/compliance/audit-package?locale=${locale}`, '_blank');
  }, [locale]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const me = await getMe();
        setUser(me);

        const [scoreRes, treatRes, alertsRes, checklistRes, dsrRes, regRes] = await Promise.all([
          api.get<ComplianceScore>('/compliance/score').catch(() => null),
          api.get<PaginatedResponse<TreatmentDto>>(`/treatments?limit=${TREATMENTS_LIMIT}`),
          api.get<AlertsResult>('/alerts').catch(() => null),
          api.get<ChecklistResponseDto[]>('/checklist/responses').catch(() => []),
          api.get<DsrStatsDto>('/dsr/stats').catch(() => null),
          api.get<{ count: number }>('/regulatory-updates/new-count').catch(() => null),
        ]);

        setCompliance(scoreRes);
        setTreatments(treatRes.data);
        setAlerts(alertsRes);
        setDsrStats(dsrRes);
        if (regRes) setRegulatoryNewCount(regRes.count);
        setChecklistAnswered(Array.isArray(checklistRes) ? checklistRes.length : 0);

        if (me && ADMIN_FINE_ROLES.has(me.role)) {
          const [snapRes] = await Promise.all([
            api.get<Snapshot[]>('/compliance/snapshots').catch(() => []),
            api.get<FineExposure>('/compliance/fine-exposure').catch(() => null),
          ]);
          setSnapshots(snapRes ?? []);
        }
      } catch {
        // swallow — UI degrades gracefully
      } finally {
        setLoading(false);
      }
    }
    void fetchAll();
  }, []);

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className={SPINNER_CLASS} />
      </div>
    );
  }

  const score = compliance?.score ?? 0;
  const breakdown = compliance?.breakdown;
  const totalTreatments = treatments.length;
  const validatedCount = treatments.filter(tr => tr.status === TreatmentStatus.VALIDATED).length;
  const draftCount = treatments.filter(tr => tr.status === TreatmentStatus.DRAFT).length;
  const needsReviewCount = countOutdated(treatments);
  const freshTreatments = countByFreshness(treatments, 'FRESH');
  const treatmentsWithIndicators = treatments.filter(tr => tr.indicators !== undefined).length;
  const freshness =
    treatmentsWithIndicators > 0
      ? { validated: freshTreatments, total: treatmentsWithIndicators }
      : null;
  const openViolations = breakdown?.violations.openByLevel ?? {};
  const totalViolations = Object.values(openViolations).reduce((s, n) => s + n, 0);
  const dsrOpen = dsrOpenCount(dsrStats);
  const dsrOverdue = dsrStats?.overdue ?? 0;
  const vendorAlerts = countVendorAlerts(alerts);
  const checklistTotal = breakdown?.checklist?.total ?? 0;
  const mappedAlerts = mapAlerts(alerts);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <HeroBand
          greetingName={getGreetingName(user)}
          isAdmin={isAdmin}
          onDownloadReport={handleDownloadReport}
          onDownloadAuditPackage={handleDownloadAuditPackage}
        />
        <ScoreCard
          score={score}
          checklist={{ answered: checklistAnswered, total: checklistTotal }}
          freshness={freshness}
          totalViolations={totalViolations}
          snapshots={snapshots}
        />
      </div>
      <AttentionBand alerts={mappedAlerts} total={alerts?.summary.total} />
      <KpiGrid
        treatments={{
          validated: validatedCount,
          total: totalTreatments,
          draft: draftCount,
          needsReview: needsReviewCount,
        }}
        dsr={{ open: dsrOpen, overdue: dsrOverdue }}
        regulatoryNewCount={regulatoryNewCount}
        vendorAlerts={vendorAlerts}
      />
      <RecentTreatments treatments={treatments} />
    </div>
  );
}
