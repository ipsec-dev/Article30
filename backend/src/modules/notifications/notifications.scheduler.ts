import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationService } from './notification.service';
import {
  formatDsrType,
  formatSeverity,
  formatDateLocale,
  formatDateTimeLocale,
  shortRef,
  MS_PER_HOUR,
  MS_PER_DAY,
} from './format';
import { resolveRecipientLocale } from './locale-resolver';

interface OrgCtx {
  dpoEmail: string | null;
  dpoName: string | null;
  companyName: string | null;
  locale: string;
  notifyDsrDeadline: boolean;
  notifyVendorDpaExpiry: boolean;
  notifyTreatmentReview: boolean;
  notifyViolation72h: boolean;
}

/**
 * Periodic sweeps that emit deadline-bound notifications. Every per-record
 * notify() call is wrapped in try/catch so a single bad row never aborts the
 * sweep — the failure is logged and the loop continues. Idempotency is enforced
 * downstream by NotificationService via the (kind, recordId, leadTime) unique
 * constraint on notification_log, so re-running a sweep on the same day is safe.
 */
@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationService,
  ) {}

  // Daily 08:00 — DSR / vendor DPA / treatment review. Pinned to Europe/Paris
  // because CNIL deadlines are wall-clock Paris time; container TZ is UTC in
  // production which would shift the run to 09:00/10:00 local across DST.
  @Cron('0 8 * * *', { timeZone: 'Europe/Paris' })
  async runDailyDeadlineSweep(): Promise<void> {
    if (!this.mail.isEnabled()) return;
    const org = await this.loadOrg();
    if (!org) return;
    // Per-sweep try/catch so a transient DB failure in one sweep (the unguarded
    // findMany at the top of each) does not skip the remaining sweeps for the
    // rest of the day. Each sweep already handles per-record failures inside.
    const sweeps = [
      ['dsr', () => this.sweepDsrDeadlines(org)],
      ['vendor-dpa', () => this.sweepVendorDpaExpiry(org)],
      ['treatment', () => this.sweepTreatmentReview(org)],
    ] as const;
    for (const [name, sweep] of sweeps) {
      try {
        await sweep();
      } catch (err) {
        this.logger.error({ event: 'sweep.failed', sweep: name, err });
      }
    }
  }

  // Every 6h — violation 72h CNIL window. Higher cadence so the T-24h / T-6h
  // windows are not missed by a single missed daily tick. Paris-pinned for the
  // same reason as the daily sweep.
  @Cron('0 */6 * * *', { timeZone: 'Europe/Paris' })
  async runViolation72hSweep(): Promise<void> {
    if (!this.mail.isEnabled()) return;
    const org = await this.loadOrg();
    if (!org) return;
    if (!org.notifyViolation72h) return;

    // Outer try/catch — a DB hiccup on findMany would otherwise crash the cron
    // tick. Per-record notify() failures are handled inside the loop.
    try {
      const now = Date.now();
      const violations = await this.prisma.violation.findMany({
        where: {
          severity: { in: ['HIGH', 'CRITICAL'] },
          awarenessAt: {
            gte: new Date(now - 72 * MS_PER_HOUR),
            lte: new Date(now),
          },
          status: { notIn: ['NOTIFIED_CNIL', 'REMEDIATED', 'CLOSED', 'DISMISSED'] },
        },
        include: { assignee: { select: { email: true, firstName: true } } },
      });

      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      const locale = resolveRecipientLocale(org.locale);
      for (const v of violations) {
        const remainingMs = v.awarenessAt.getTime() + 72 * MS_PER_HOUR - now;
        // Two stripes: "1 day left" (12h–30h remaining) and "6h left" (0–12h).
        // The 30h upper bound covers the 6h cron jitter on either side of T-24h.
        let leadTime: 'T-24h' | 'T-6h' | null = null;
        if (remainingMs > 12 * MS_PER_HOUR && remainingMs <= 30 * MS_PER_HOUR) {
          leadTime = 'T-24h';
        } else if (remainingMs > 0 && remainingMs <= 12 * MS_PER_HOUR) {
          leadTime = 'T-6h';
        }
        if (!leadTime) continue;

        const cnilDeadline = new Date(v.awarenessAt.getTime() + 72 * MS_PER_HOUR);
        const remainingHours = Math.max(
          0,
          Math.round((cnilDeadline.getTime() - now) / MS_PER_HOUR),
        );
        const ref = shortRef('VIO', v.id);
        try {
          await this.notifications.notify({
            kind: 'violation.72h-window',
            recordId: v.id,
            leadTime,
            assigneeEmail: v.assignee?.email ?? null,
            orgDpoEmail: org.dpoEmail,
            orgLocale: org.locale,
            orgCompanyName: org.companyName ?? '',
            recipientRole: v.assignee ? 'assignee' : 'dpo',
            settings: { notifyViolation72h: org.notifyViolation72h },
            context: {
              recipientFirstName: v.assignee?.firstName ?? org.dpoName ?? '',
              severityLabel: formatSeverity(v.severity, locale),
              cnilDeadlineDate: formatDateTimeLocale(cnilDeadline, locale),
              leadTimeLabel: locale === 'fr' ? `${remainingHours} h` : `${remainingHours} hours`,
              shortRef: ref,
              recordUrl: `${frontendUrl}/violations/${v.id}`,
            },
          });
        } catch (err) {
          this.logger.error({
            event: 'notification.failed',
            kind: 'violation.72h-window',
            recordId: v.id,
            err,
          });
        }
      }
    } catch (err) {
      this.logger.error({ event: 'sweep.failed', sweep: 'violation-72h', err });
    }
  }

  private async loadOrg(): Promise<OrgCtx | null> {
    return this.prisma.organization.findFirst({
      select: {
        dpoEmail: true,
        dpoName: true,
        companyName: true,
        locale: true,
        notifyDsrDeadline: true,
        notifyVendorDpaExpiry: true,
        notifyTreatmentReview: true,
        notifyViolation72h: true,
      },
    });
  }

  private async sweepDsrDeadlines(org: OrgCtx): Promise<void> {
    if (!org.notifyDsrDeadline) return;
    const today = startOfToday();
    const dsrs = await this.prisma.dataSubjectRequest.findMany({
      where: {
        deadline: {
          gte: new Date(today.getTime() - MS_PER_DAY),
          lt: new Date(today.getTime() + 8 * MS_PER_DAY),
        },
        status: { not: 'CLOSED' },
      },
      include: { assignee: { select: { email: true, firstName: true } } },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const locale = resolveRecipientLocale(org.locale);
    for (const dsr of dsrs) {
      const days = Math.round((dsr.deadline.getTime() - today.getTime()) / MS_PER_DAY);
      let leadTime: 'T-7' | 'T-1' | 'T+1' | null = null;
      if (days === 7) {
        leadTime = 'T-7';
      } else if (days === 1) {
        leadTime = 'T-1';
      } else if (days === -1) {
        leadTime = 'T+1';
      }
      if (!leadTime) continue;

      const leadTimeLabel =
        leadTime === 'T-7'
          ? locale === 'fr'
            ? '7 jours'
            : '7 days'
          : leadTime === 'T-1'
            ? locale === 'fr'
              ? '1 jour'
              : '1 day'
            : locale === 'fr'
              ? 'en retard'
              : 'overdue';
      const ref = shortRef('DSR', dsr.id);

      try {
        await this.notifications.notify({
          kind: 'dsr.deadline-approaching',
          recordId: dsr.id,
          leadTime,
          assigneeEmail: dsr.assignee?.email ?? null,
          orgDpoEmail: org.dpoEmail,
          orgLocale: org.locale,
          orgCompanyName: org.companyName ?? '',
          recipientRole: dsr.assignee ? 'assignee' : 'dpo',
          settings: { notifyDsrDeadline: org.notifyDsrDeadline },
          context: {
            recipientFirstName: dsr.assignee?.firstName ?? org.dpoName ?? '',
            dsrTypeLabel: formatDsrType(dsr.type, locale),
            requesterName: dsr.requesterName,
            deadlineDate: formatDateLocale(dsr.deadline, locale),
            leadTimeLabel,
            shortRef: ref,
            recordUrl: `${frontendUrl}/dsr/${dsr.id}`,
          },
        });
      } catch (err) {
        this.logger.error({
          event: 'notification.failed',
          kind: 'dsr.deadline-approaching',
          recordId: dsr.id,
          err,
        });
      }
    }
  }

  private async sweepVendorDpaExpiry(org: OrgCtx): Promise<void> {
    if (!org.notifyVendorDpaExpiry) return;
    const today = startOfToday();
    const vendors = await this.prisma.vendor.findMany({
      where: {
        dpaExpiry: {
          gte: today,
          lt: new Date(today.getTime() + 31 * MS_PER_DAY),
        },
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const locale = resolveRecipientLocale(org.locale);
    for (const v of vendors) {
      if (!v.dpaExpiry) continue;
      const days = Math.round((v.dpaExpiry.getTime() - today.getTime()) / MS_PER_DAY);
      let leadTime: 'T-30' | 'T-7' | 'T-1' | null = null;
      if (days === 30) {
        leadTime = 'T-30';
      } else if (days === 7) {
        leadTime = 'T-7';
      } else if (days === 1) {
        leadTime = 'T-1';
      }
      if (!leadTime) continue;

      const leadTimeLabel =
        leadTime === 'T-30'
          ? locale === 'fr'
            ? '30 jours'
            : '30 days'
          : leadTime === 'T-7'
            ? locale === 'fr'
              ? '7 jours'
              : '7 days'
            : locale === 'fr'
              ? '1 jour'
              : '1 day';
      const ref = shortRef('VEN', v.id);

      try {
        await this.notifications.notify({
          kind: 'vendor.dpa-expiring',
          recordId: v.id,
          leadTime,
          // Vendor has no assignee in the schema — always route to org DPO.
          assigneeEmail: null,
          orgDpoEmail: org.dpoEmail,
          orgLocale: org.locale,
          orgCompanyName: org.companyName ?? '',
          recipientRole: 'dpo',
          settings: { notifyVendorDpaExpiry: org.notifyVendorDpaExpiry },
          context: {
            recipientFirstName: org.dpoName ?? '',
            vendorName: v.name,
            expiryDate: formatDateLocale(v.dpaExpiry, locale),
            leadTimeLabel,
            shortRef: ref,
            recordUrl: `${frontendUrl}/vendors/${v.id}`,
          },
        });
      } catch (err) {
        this.logger.error({
          event: 'notification.failed',
          kind: 'vendor.dpa-expiring',
          recordId: v.id,
          err,
        });
      }
    }
  }

  private async sweepTreatmentReview(org: OrgCtx): Promise<void> {
    if (!org.notifyTreatmentReview) return;
    const today = startOfToday();
    const treatments = await this.prisma.treatment.findMany({
      where: {
        nextReviewAt: {
          gte: new Date(today.getTime() - MS_PER_DAY),
          lt: new Date(today.getTime() + 8 * MS_PER_DAY),
        },
      },
      include: { assignee: { select: { email: true, firstName: true } } },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const locale = resolveRecipientLocale(org.locale);
    for (const t of treatments) {
      if (!t.nextReviewAt) continue;
      const days = Math.round((t.nextReviewAt.getTime() - today.getTime()) / MS_PER_DAY);
      let leadTime: 'T-7' | 'T+1' | null = null;
      if (days === 7) {
        leadTime = 'T-7';
      } else if (days === -1) {
        leadTime = 'T+1';
      }
      if (!leadTime) continue;

      const leadTimeLabel =
        leadTime === 'T-7'
          ? locale === 'fr'
            ? '7 jours'
            : '7 days'
          : locale === 'fr'
            ? 'en retard'
            : 'overdue';
      const ref = shortRef('TRT', t.id);

      try {
        await this.notifications.notify({
          kind: 'treatment.review-due',
          recordId: t.id,
          leadTime,
          assigneeEmail: t.assignee?.email ?? null,
          orgDpoEmail: org.dpoEmail,
          orgLocale: org.locale,
          orgCompanyName: org.companyName ?? '',
          recipientRole: t.assignee ? 'assignee' : 'dpo',
          settings: { notifyTreatmentReview: org.notifyTreatmentReview },
          context: {
            recipientFirstName: t.assignee?.firstName ?? org.dpoName ?? '',
            treatmentName: t.name,
            reviewDate: formatDateLocale(t.nextReviewAt, locale),
            leadTimeLabel,
            shortRef: ref,
            recordUrl: `${frontendUrl}/register/${t.id}`,
          },
        });
      } catch (err) {
        this.logger.error({
          event: 'notification.failed',
          kind: 'treatment.review-due',
          recordId: t.id,
          err,
        });
      }
    }
  }
}

// Wall-clock midnight in server local time. A DST transition between `today`
// and a deadline shifts the millisecond diff by ±1h, but
// `Math.round((deadline - today) / MS_PER_DAY)` in each sweep absorbs the drift back
// to the intended day count. If you ever change the day math to `Math.floor`
// or use a precision-sensitive library, revisit.
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
