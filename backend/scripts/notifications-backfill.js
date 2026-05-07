/* eslint-disable */
/**
 * One-shot CLI to suppress the first-deploy notification thunderclap.
 *
 * For every record currently inside any reminder lead-time window, insert a
 * notification_log row marking each (kind, recordId, leadTime) as already
 * sent. The next scheduler tick then treats those as handled and only fires
 * for genuinely new events from that point forward.
 *
 * Run AFTER `prisma migrate deploy` and BEFORE the first scheduler tick:
 *   pnpm --filter @article30/backend notifications:backfill
 *
 * Idempotent — safe to re-run; the unique constraint
 * (kind, recordId, leadTime) on notification_log prevents duplicate rows
 * (Prisma surfaces the violation as P2002, which we swallow).
 *
 * The lead-time windows and status filters mirror the live cron sweeps in
 * src/modules/notifications/notifications.scheduler.ts. If you change those
 * windows, mirror the change here so the backfill keeps suppressing the same
 * set of records.
 *
 * Per-org toggles (notifyDsrDeadline etc.) are intentionally NOT consulted:
 * we pre-seed all kinds so that flipping a toggle ON later doesn't trigger a
 * thunderclap for records that were inside the window at backfill time.
 */
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/prisma/prisma.service');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Sentinel email — recipientEmail is part of the notification_log row but not
// of the unique constraint, so any value works. A literal sentinel makes the
// backfilled rows trivially auditable in the DB.
const SENTINEL = '__BACKFILL__';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const today = startOfToday();
  let inserted = 0;

  const insert = async (kind, recordId, leadTime) => {
    try {
      await prisma.notificationLog.create({
        data: { kind, recordId, leadTime, recipientEmail: SENTINEL },
      });
      inserted++;
    } catch (err) {
      // P2002 = unique constraint already satisfied — idempotent re-run.
      if (err.code !== 'P2002') throw err;
    }
  };

  // DSR deadlines (mirrors sweepDsrDeadlines): T-7 / T-1 / T+1 day stripes
  // around `deadline`. Status filter excludes CLOSED — same as the scheduler.
  const dsrs = await prisma.dataSubjectRequest.findMany({
    where: {
      deadline: {
        gte: new Date(today.getTime() - DAY),
        lt: new Date(today.getTime() + 8 * DAY),
      },
      status: { not: 'CLOSED' },
    },
  });
  for (const d of dsrs) {
    const days = Math.round((d.deadline.getTime() - today.getTime()) / DAY);
    if (days === 7) await insert('dsr.deadline-approaching', d.id, 'T-7');
    if (days === 1) await insert('dsr.deadline-approaching', d.id, 'T-1');
    if (days === -1) await insert('dsr.deadline-approaching', d.id, 'T+1');
  }

  // Vendor DPA expiry (mirrors sweepVendorDpaExpiry): T-30 / T-7 / T-1 day
  // stripes around `dpaExpiry`. No status filter — schema has no vendor status.
  const vendors = await prisma.vendor.findMany({
    where: {
      dpaExpiry: {
        gte: today,
        lt: new Date(today.getTime() + 31 * DAY),
      },
    },
  });
  for (const v of vendors) {
    if (!v.dpaExpiry) continue;
    const days = Math.round((v.dpaExpiry.getTime() - today.getTime()) / DAY);
    if (days === 30) await insert('vendor.dpa-expiring', v.id, 'T-30');
    if (days === 7) await insert('vendor.dpa-expiring', v.id, 'T-7');
    if (days === 1) await insert('vendor.dpa-expiring', v.id, 'T-1');
  }

  // Treatment review (mirrors sweepTreatmentReview): T-7 / T+1 stripes around
  // `nextReviewAt`. No status filter — review applies to every treatment with
  // a scheduled next review.
  const treatments = await prisma.treatment.findMany({
    where: {
      nextReviewAt: {
        gte: new Date(today.getTime() - DAY),
        lt: new Date(today.getTime() + 8 * DAY),
      },
    },
  });
  for (const t of treatments) {
    if (!t.nextReviewAt) continue;
    const days = Math.round((t.nextReviewAt.getTime() - today.getTime()) / DAY);
    if (days === 7) await insert('treatment.review-due', t.id, 'T-7');
    if (days === -1) await insert('treatment.review-due', t.id, 'T+1');
  }

  // Violation 72h CNIL window (mirrors runViolation72hSweep): HIGH/CRITICAL
  // severity, awarenessAt within the last 72h, status not in the terminal /
  // already-notified set. We seed both T-24h and T-6h so neither stripe fires
  // on the first scheduler tick after deploy.
  const now = Date.now();
  const violations = await prisma.violation.findMany({
    where: {
      severity: { in: ['HIGH', 'CRITICAL'] },
      awarenessAt: {
        gte: new Date(now - 72 * HOUR),
        lte: new Date(now),
      },
      status: { notIn: ['NOTIFIED_CNIL', 'REMEDIATED', 'CLOSED', 'DISMISSED'] },
    },
  });
  for (const v of violations) {
    await insert('violation.72h-window', v.id, 'T-24h');
    await insert('violation.72h-window', v.id, 'T-6h');
  }

  console.log(`backfill: inserted ${inserted} notification_log rows`);
  await app.close();
}

main()
  .then(() => {
    // app.close() does not unref scheduler/Redis handles fast enough on its own,
    // so the process can hang for minutes after the work is done. Force-exit.
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
