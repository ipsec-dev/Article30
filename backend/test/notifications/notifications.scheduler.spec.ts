import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { NotificationsScheduler } from '../../src/modules/notifications/notifications.scheduler';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module';
import { MailService } from '../../src/modules/mail/mail.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 4;
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

describe('NotificationsScheduler', () => {
  let module: TestingModule;
  let scheduler: NotificationsScheduler;
  let prisma: PrismaService;
  const mail = {
    send: vi.fn().mockResolvedValue(undefined),
    isEnabled: vi.fn().mockReturnValue(true),
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.FRONTEND_URL = 'https://app.test';
    module = await Test.createTestingModule({
      imports: [PrismaModule, NotificationsModule],
    })
      .overrideProvider(MailService)
      .useValue(mail)
      .compile();

    scheduler = module.get(NotificationsScheduler);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    mail.send.mockClear();
    mail.isEnabled.mockReturnValue(true);
    await cleanupDatabase(prisma);
    await prisma.organization.create({
      data: {
        slug: `sch-${Date.now()}`,
        locale: 'fr',
        dpoEmail: 'dpo@example.com',
        dpoName: 'Diana DPO',
        companyName: 'Acme',
      },
    });
  });

  async function seedUser(email: string) {
    return prisma.user.create({
      data: {
        firstName: 'Vince',
        lastName: 'Violator',
        email,
        password: await bcrypt.hash('x', BCRYPT_ROUNDS),
        role: 'EDITOR',
        approved: true,
      },
    });
  }

  function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  it('emits dsr.deadline-approaching for DSRs at T-7 / T-1 / T+1 windows', async () => {
    const today = startOfToday();
    const dsr7 = await prisma.dataSubjectRequest.create({
      data: {
        type: 'ACCESS',
        requesterName: 'Alice',
        requesterEmail: 'a@x.com',
        deadline: new Date(today.getTime() + 7 * DAY),
      },
    });
    const dsr1 = await prisma.dataSubjectRequest.create({
      data: {
        type: 'ACCESS',
        requesterName: 'Bob',
        requesterEmail: 'b@x.com',
        deadline: new Date(today.getTime() + 1 * DAY),
      },
    });
    const dsrPast = await prisma.dataSubjectRequest.create({
      data: {
        type: 'ACCESS',
        requesterName: 'Cara',
        requesterEmail: 'c@x.com',
        deadline: new Date(today.getTime() - 1 * DAY),
      },
    });
    // Out of window — should not fire.
    await prisma.dataSubjectRequest.create({
      data: {
        type: 'ACCESS',
        requesterName: 'Dan',
        requesterEmail: 'd@x.com',
        deadline: new Date(today.getTime() + 14 * DAY),
      },
    });

    await scheduler.runDailyDeadlineSweep();

    expect(mail.send).toHaveBeenCalledTimes(3);
    const logs = await prisma.notificationLog.findMany({
      where: { kind: 'dsr.deadline-approaching' },
    });
    const recordIds = logs.map(l => l.recordId).sort();
    expect(recordIds).toEqual([dsr1.id, dsr7.id, dsrPast.id].sort());
  });

  it('does not re-send within the same day (idempotent log)', async () => {
    const today = startOfToday();
    await prisma.dataSubjectRequest.create({
      data: {
        type: 'ACCESS',
        requesterName: 'Alice',
        requesterEmail: 'a@x.com',
        deadline: new Date(today.getTime() + 7 * DAY),
      },
    });

    await scheduler.runDailyDeadlineSweep();
    await scheduler.runDailyDeadlineSweep();

    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('respects the per-org toggle (notifyDsrDeadline=false)', async () => {
    await prisma.organization.updateMany({ data: { notifyDsrDeadline: false } });
    const today = startOfToday();
    await prisma.dataSubjectRequest.create({
      data: {
        type: 'ACCESS',
        requesterName: 'Alice',
        requesterEmail: 'a@x.com',
        deadline: new Date(today.getTime() + 7 * DAY),
      },
    });

    await scheduler.runDailyDeadlineSweep();

    expect(mail.send).not.toHaveBeenCalled();
  });

  it('runViolation72hSweep notifies HIGH/CRITICAL violations within the T-24h window', async () => {
    const owner = await seedUser('owen@example.com');
    const now = new Date();
    // Violation discovered 48h ago → ~24h remaining → matches T-24h window.
    const v = await prisma.violation.create({
      data: {
        title: 'Major leak',
        severity: 'HIGH',
        awarenessAt: new Date(now.getTime() - 48 * HOUR),
        createdBy: owner.id,
      },
    });

    await scheduler.runViolation72hSweep();

    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'violation-72h' }),
    );
    const log = await prisma.notificationLog.findFirst({
      where: { kind: 'violation.72h-window', recordId: v.id },
    });
    expect(log).not.toBeNull();
    expect(log?.leadTime).toBe('T-24h');
  });

  it('emits vendor.dpa-expiring at T-30 / T-7 / T-1 windows', async () => {
    const owner = await seedUser('vendor-owner@example.com');
    const today = startOfToday();
    await prisma.vendor.create({
      data: {
        name: 'A',
        dpaExpiry: new Date(today.getTime() + 30 * DAY),
        createdBy: owner.id,
      },
    });
    await prisma.vendor.create({
      data: {
        name: 'B',
        dpaExpiry: new Date(today.getTime() + 7 * DAY),
        createdBy: owner.id,
      },
    });
    await prisma.vendor.create({
      data: {
        name: 'C',
        dpaExpiry: new Date(today.getTime() + 1 * DAY),
        createdBy: owner.id,
      },
    });
    // Out of window — should not fire.
    await prisma.vendor.create({
      data: {
        name: 'D',
        dpaExpiry: new Date(today.getTime() + 14 * DAY),
        createdBy: owner.id,
      },
    });

    await scheduler.runDailyDeadlineSweep();

    const calls = mail.send.mock.calls.filter(
      c => (c[0] as { templateId: string }).templateId === 'vendor-dpa-expiring',
    );
    expect(calls).toHaveLength(3);
  });

  it('emits treatment.review-due at T-7 and T+1 windows', async () => {
    const owner = await seedUser('treatment-owner@example.com');
    const today = startOfToday();
    await prisma.treatment.create({
      data: {
        name: 'P1',
        nextReviewAt: new Date(today.getTime() + 7 * DAY),
        createdBy: owner.id,
      },
    });
    await prisma.treatment.create({
      data: {
        name: 'P2',
        nextReviewAt: new Date(today.getTime() - 1 * DAY),
        createdBy: owner.id,
      },
    });
    // Out of window — should not fire.
    await prisma.treatment.create({
      data: {
        name: 'P3',
        nextReviewAt: new Date(today.getTime() + 14 * DAY),
        createdBy: owner.id,
      },
    });

    await scheduler.runDailyDeadlineSweep();

    const calls = mail.send.mock.calls.filter(
      c => (c[0] as { templateId: string }).templateId === 'treatment-review-due',
    );
    expect(calls).toHaveLength(2);
  });

  it('skips entirely when SMTP is disabled', async () => {
    mail.isEnabled.mockReturnValue(false);
    const today = startOfToday();
    await prisma.dataSubjectRequest.create({
      data: {
        type: 'ACCESS',
        requesterName: 'Alice',
        requesterEmail: 'a@x.com',
        deadline: new Date(today.getTime() + 7 * DAY),
      },
    });

    await scheduler.runDailyDeadlineSweep();

    expect(mail.send).not.toHaveBeenCalled();
  });

  it('builds the 5-block context for dsr.deadline-approaching', async () => {
    const today = startOfToday();
    await prisma.dataSubjectRequest.create({
      data: {
        type: 'ACCESS',
        requesterName: 'A',
        requesterEmail: 'a@x.com',
        deadline: new Date(today.getTime() + 7 * DAY),
      },
    });
    await scheduler.runDailyDeadlineSweep();
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'dsr-deadline',
        context: expect.objectContaining({
          dsrTypeLabel: "Demande d'accès (Art. 15 RGPD)",
          requesterName: 'A',
          deadlineDate: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
          leadTimeLabel: '7 jours',
          shortRef: expect.stringMatching(/^DSR-[a-f0-9]{8}$/),
          footerOrientation: expect.stringContaining('DPO'),
        }),
      }),
    );
  });

  it('builds the 5-block context for vendor.dpa-expiring', async () => {
    const owner = await seedUser('vendor-ctx@example.com');
    const today = startOfToday();
    await prisma.vendor.create({
      data: {
        name: 'Stripe',
        createdBy: owner.id,
        dpaExpiry: new Date(today.getTime() + 30 * DAY),
      },
    });
    await scheduler.runDailyDeadlineSweep();
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'vendor-dpa-expiring',
        context: expect.objectContaining({
          vendorName: 'Stripe',
          expiryDate: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
          leadTimeLabel: '30 jours',
          shortRef: expect.stringMatching(/^VEN-[a-f0-9]{8}$/),
        }),
      }),
    );
  });

  it('builds the 5-block context for treatment.review-due', async () => {
    const owner = await seedUser('treatment-ctx@example.com');
    const today = startOfToday();
    await prisma.treatment.create({
      data: {
        name: 'Mailing list',
        createdBy: owner.id,
        nextReviewAt: new Date(today.getTime() + 7 * DAY),
      },
    });
    await scheduler.runDailyDeadlineSweep();
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'treatment-review-due',
        context: expect.objectContaining({
          treatmentName: 'Mailing list',
          reviewDate: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
          leadTimeLabel: '7 jours',
          shortRef: expect.stringMatching(/^TRT-[a-f0-9]{8}$/),
        }),
      }),
    );
  });

  it('builds the 5-block context for violation.72h-window', async () => {
    const owner = await seedUser('violation-ctx@example.com');
    await prisma.violation.create({
      data: {
        title: 'Big',
        severity: 'HIGH',
        awarenessAt: new Date(Date.now() - 48 * HOUR),
        createdBy: owner.id,
      },
    });
    await scheduler.runViolation72hSweep();
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'violation-72h',
        context: expect.objectContaining({
          severityLabel: 'Élevée',
          cnilDeadlineDate: expect.stringMatching(/heure de Paris/),
          leadTimeLabel: expect.stringMatching(/h/),
          shortRef: expect.stringMatching(/^VIO-[a-f0-9]{8}$/),
        }),
      }),
    );
  });
});
