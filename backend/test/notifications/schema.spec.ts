import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('notification_log schema', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL_TEST ??
      'postgresql://article30:article30_secret@localhost:5432/article30_test';
    prisma = new PrismaService();
    await prisma.$connect();
    await prisma.notificationLog.deleteMany();
  });

  afterAll(async () => {
    await prisma.notificationLog.deleteMany();
    await prisma.$disconnect();
  });

  it('rejects duplicate (kind, recordId, leadTime) tuples', async () => {
    await prisma.notificationLog.create({
      data: {
        kind: 'dsr.submitted',
        recordId: 'rec-1',
        leadTime: 'INSTANT',
        recipientEmail: 'a@example.com',
      },
    });
    await expect(
      prisma.notificationLog.create({
        data: {
          kind: 'dsr.submitted',
          recordId: 'rec-1',
          leadTime: 'INSTANT',
          recipientEmail: 'b@example.com',
        },
      }),
    ).rejects.toThrow(/Unique constraint/);
  });

  it('allows different leadTime for same record', async () => {
    await prisma.notificationLog.create({
      data: {
        kind: 'dsr.deadline-approaching',
        recordId: 'rec-2',
        leadTime: 'T-7',
        recipientEmail: 'a@example.com',
      },
    });
    await prisma.notificationLog.create({
      data: {
        kind: 'dsr.deadline-approaching',
        recordId: 'rec-2',
        leadTime: 'T-1',
        recipientEmail: 'a@example.com',
      },
    });
    const rows = await prisma.notificationLog.findMany({
      where: { recordId: 'rec-2' },
    });
    expect(rows).toHaveLength(2);
  });

  it('exposes the four organization notification toggles with default true', async () => {
    const org = await prisma.organization.create({
      data: { slug: `notif-defaults-${Date.now()}`, locale: 'fr' },
    });
    try {
      expect(org.notifyDsrDeadline).toBe(true);
      expect(org.notifyVendorDpaExpiry).toBe(true);
      expect(org.notifyTreatmentReview).toBe(true);
      expect(org.notifyViolation72h).toBe(true);
    } finally {
      await prisma.organization.delete({ where: { id: org.id } });
    }
  });
});
