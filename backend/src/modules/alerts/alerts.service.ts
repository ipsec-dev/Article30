import { Injectable } from '@nestjs/common';
import { Severity, DSR_TERMINAL_STATUSES } from '@article30/shared';
import { DsrStatus, type DsrDeadlineProfile } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { computeDeadline, type DeadlineProfile } from '../../common/deadlines';

const DSR_PROFILE_MAP: Record<DsrDeadlineProfile, DeadlineProfile> = {
  STANDARD_30D: 'DSR_STANDARD_30D',
  EXTENDED_90D: 'DSR_EXTENDED_90D',
  HEALTH_8D: 'DSR_HEALTH_8D',
  HEALTH_OLD_60D: 'DSR_HEALTH_OLD_60D',
};

type AlertType =
  | 'OPEN_VIOLATION'
  | 'TREATMENT_OVERDUE'
  | 'CHECKLIST_NON_COMPLIANT'
  | 'DSR_DEADLINE'
  | 'CHECKLIST_REVIEW_DUE'
  | 'VENDOR_DPA_MISSING'
  | 'VENDOR_DPA_EXPIRING';

export interface AlertItem {
  type: AlertType;
  entityId: string;
  title: string;
  severity: Severity;
  dueDate: string | null;
  url: string;
}

export interface AlertsSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
}

export interface AlertsResult {
  items: AlertItem[];
  summary: AlertsSummary;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  [Severity.CRITICAL]: 0,
  [Severity.HIGH]: 1,
  [Severity.MEDIUM]: 2,
  [Severity.LOW]: 3,
};

const HOURS_THRESHOLD_CRITICAL = 12;
const HOURS_THRESHOLD_HIGH = 24;
const MS_PER_HOUR = 1000 * 60 * 60;
const DAYS_DRAFT_OVERDUE = 30;
const MONTHS_VALIDATED_OVERDUE = 12;
const DAYS_REVIEW_LOOKAHEAD = 30;
const DAYS_DSR_LOOKAHEAD = 7;
const DAYS_DPA_EXPIRY_LOOKAHEAD = 30;

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAlerts(): Promise<AlertsResult> {
    const [violations, treatments, checklistResponses, dsrs, checklistReviews, vendorAlerts] =
      await Promise.all([
        this.getOpenViolations(),
        this.getOverdueTreatments(),
        this.getNonCompliantChecklist(),
        this.getDsrDeadlines(),
        this.getChecklistReviewDue(),
        this.getVendorAlerts(),
      ]);

    const items = [
      ...violations,
      ...treatments,
      ...checklistResponses,
      ...dsrs,
      ...checklistReviews,
      ...vendorAlerts,
    ];

    items.sort((a, b) => {
      const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }

      if (a.dueDate === null && b.dueDate === null) {
        return 0;
      }
      if (a.dueDate === null) {
        return 1;
      }
      if (b.dueDate === null) {
        return -1;
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const summary: AlertsSummary = {
      total: items.length,
      critical: items.filter(i => i.severity === Severity.CRITICAL).length,
      high: items.filter(i => i.severity === Severity.HIGH).length,
      medium: items.filter(i => i.severity === Severity.MEDIUM).length,
    };

    return { items, summary };
  }

  private async getOpenViolations(): Promise<AlertItem[]> {
    const violations = await this.prisma.violation.findMany({
      where: { status: { not: 'CLOSED' } },
      include: {
        notificationFilings: { select: { id: true }, take: 1 },
      },
    });

    const now = new Date();

    return violations.map(v => {
      // Statuses where the 72h CNIL notification clock is still ticking.
      const isPreNotification =
        v.status === 'RECEIVED' ||
        v.status === 'TRIAGED' ||
        v.status === 'ASSESSED' ||
        v.status === 'CONTAINED' ||
        v.status === 'NOTIFICATION_PENDING';

      let dueDate: string | null = null;
      let severity = v.severity as Severity;

      // dueDate is intentionally populated only while the 72h CNIL clock is still
      // ticking. Once a BreachNotificationFiling row exists, the deadline is met —
      // surfacing it on the alert would mislead the dashboard.
      const hasBeenFiledWithCnil = v.notificationFilings.length > 0;
      if (isPreNotification && !hasBeenFiledWithCnil) {
        const result = computeDeadline({
          profile: 'BREACH_CNIL_72H',
          anchorAt: v.awarenessAt,
          now,
        });
        dueDate = result.effectiveDeadline.toISOString();

        // Severity tiering matches the original behaviour: critical at any overdue
        // OR < 12h to deadline, high at < 24h, otherwise the violation's own severity.
        const msToDeadline = result.effectiveDeadline.getTime() - now.getTime();
        if (result.isOverdue || msToDeadline < HOURS_THRESHOLD_CRITICAL * MS_PER_HOUR) {
          severity = Severity.CRITICAL;
        } else if (msToDeadline < HOURS_THRESHOLD_HIGH * MS_PER_HOUR) {
          severity = Severity.HIGH;
        }
        // otherwise keep the violation's original severity
      }

      return {
        severity,
        dueDate,
        type: 'OPEN_VIOLATION' as const,
        entityId: v.id,
        title: v.title,
        url: `/violations/${v.id}`,
      };
    });
  }

  private async getOverdueTreatments(): Promise<AlertItem[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DAYS_DRAFT_OVERDUE);
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - MONTHS_VALIDATED_OVERDUE);

    const treatments = await this.prisma.treatment.findMany({
      where: {
        OR: [
          { status: 'DRAFT', updatedAt: { lt: thirtyDaysAgo } },
          { status: 'VALIDATED', updatedAt: { lt: twelveMonthsAgo } },
        ],
      },
    });

    return treatments.map(t => ({
      type: 'TREATMENT_OVERDUE' as const,
      entityId: t.id,
      title: t.name,
      severity: Severity.HIGH,
      dueDate: t.updatedAt.toISOString(),
      url: `/register/${t.id}`,
    }));
  }

  private async getNonCompliantChecklist(): Promise<AlertItem[]> {
    const responses = await this.prisma.checklistResponse.findMany({
      where: { response: { in: ['NO', 'IN_PROGRESS'] } },
    });

    return responses.map(r => ({
      type: 'CHECKLIST_NON_COMPLIANT' as const,
      entityId: r.id,
      title: `Checklist item "${r.itemId}" non-compliant`,
      severity: Severity.MEDIUM,
      dueDate: r.deadline?.toISOString() ?? null,
      url: '/governance',
    }));
  }

  private async getChecklistReviewDue(): Promise<AlertItem[]> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + DAYS_REVIEW_LOOKAHEAD);

    const responses = await this.prisma.checklistResponse.findMany({
      where: {
        nextReviewAt: { lte: thirtyDaysFromNow },
      },
    });

    return responses.map(r => {
      const reviewAt = r.nextReviewAt;
      let isPast: boolean;
      if (reviewAt) {
        isPast = reviewAt < now;
      } else {
        isPast = false;
      }
      let severity: Severity;
      if (isPast) {
        severity = Severity.HIGH;
      } else {
        severity = Severity.MEDIUM;
      }
      const dueDate = reviewAt?.toISOString() ?? null;
      return {
        severity,
        dueDate,
        type: 'CHECKLIST_REVIEW_DUE' as const,
        entityId: r.id,
        title: `Review due: ${r.itemId}`,
        url: '/governance',
      };
    });
  }

  private async getDsrDeadlines(): Promise<AlertItem[]> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + DAYS_DSR_LOOKAHEAD);

    const dsrs = await this.prisma.dataSubjectRequest.findMany({
      where: {
        status: { notIn: DSR_TERMINAL_STATUSES as unknown as DsrStatus[] },
        deadline: { lte: sevenDaysFromNow },
      },
    });

    return dsrs.map(dsr => {
      // Severity is engine-derived from the per-DSR profile + receivedAt — not
      // from the stored dsr.deadline column. The engine remains the single
      // source of truth for overdue determination so pause + extension
      // semantics (M3) flow through one path.
      const r = computeDeadline({
        profile: DSR_PROFILE_MAP[dsr.deadlineProfile],
        anchorAt: dsr.receivedAt,
        now,
      });
      const severity = r.isOverdue ? Severity.CRITICAL : Severity.HIGH;
      return {
        severity,
        type: 'DSR_DEADLINE' as const,
        entityId: dsr.id,
        title: `DSR from ${dsr.requesterName}`,
        dueDate: dsr.deadline.toISOString(),
        url: `/dsr/${dsr.id}`,
      };
    });
  }

  private async getVendorAlerts(): Promise<AlertItem[]> {
    const alerts: AlertItem[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + DAYS_DPA_EXPIRY_LOOKAHEAD);

    const vendors = await this.prisma.vendor.findMany();

    for (const vendor of vendors) {
      if (vendor.dpaStatus === 'MISSING') {
        alerts.push({
          type: 'VENDOR_DPA_MISSING',
          entityId: vendor.id,
          title: vendor.name,
          severity: Severity.HIGH,
          dueDate: null,
          url: `/vendors/${vendor.id}`,
        });
      }

      if (vendor.dpaExpiry) {
        if (vendor.dpaExpiry < now) {
          alerts.push({
            type: 'VENDOR_DPA_EXPIRING',
            entityId: vendor.id,
            title: vendor.name,
            severity: Severity.CRITICAL,
            dueDate: vendor.dpaExpiry.toISOString(),
            url: `/vendors/${vendor.id}`,
          });
        } else if (vendor.dpaExpiry <= thirtyDaysFromNow) {
          alerts.push({
            type: 'VENDOR_DPA_EXPIRING',
            entityId: vendor.id,
            title: vendor.name,
            severity: Severity.HIGH,
            dueDate: vendor.dpaExpiry.toISOString(),
            url: `/vendors/${vendor.id}`,
          });
        } else {
          // DPA expiry is further than 30 days out — no alert
        }
      }
    }

    return alerts;
  }
}
