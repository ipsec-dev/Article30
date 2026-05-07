import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Severity, ChecklistAnswer } from '@article30/shared';
import { AlertsService } from '../../src/modules/alerts/alerts.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const STALE_DAYS_AGO = 50;
const DSR_DAYS_AHEAD = 3;
const PAST_DEADLINE_DAYS = 2;
const NEAR_DEADLINE_DAYS = 5;
const DSR_STANDARD_DAYS = 30;
const MIN_ALERT_COUNT = 4;
const ALERT_TYPE_OPEN_VIOLATION = 'OPEN_VIOLATION';
const ALERT_TYPE_TREATMENT_OVERDUE = 'TREATMENT_OVERDUE';
const ALERT_TYPE_CHECKLIST_NON_COMPLIANT = 'CHECKLIST_NON_COMPLIANT';
const ALERT_TYPE_DSR_DEADLINE = 'DSR_DEADLINE';

describe('AlertsService', () => {
  let module: TestingModule;
  let service: AlertsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AlertsService],
    }).compile();

    service = module.get(AlertsService);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await module.close();
  });

  async function seedUser(overrides: { email?: string; name?: string } = {}) {
    const hashedPassword = await bcrypt.hash('password', BCRYPT_ROUNDS);
    return prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: overrides.email ?? 'user@example.com',
        password: hashedPassword,
        role: 'ADMIN',
        approved: true,
      },
    });
  }

  describe('getAlerts()', () => {
    it('returns empty when no alerts exist', async () => {
      const result = await service.getAlerts();

      expect(result.items).toEqual([]);
      expect(result.summary).toEqual({
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
      });
    });

    it('flags open violations with correct severity', async () => {
      const user = await seedUser();
      await prisma.violation.create({
        data: {
          title: 'Critical Breach',
          severity: Severity.CRITICAL,
          awarenessAt: new Date(),
          createdBy: user.id,
        },
      });
      await prisma.violation.create({
        data: {
          title: 'Minor Issue',
          severity: Severity.LOW,
          awarenessAt: new Date(),
          createdBy: user.id,
        },
      });

      const result = await service.getAlerts();
      const violationAlerts = result.items.filter(i => i.type === ALERT_TYPE_OPEN_VIOLATION);

      expect(violationAlerts).toHaveLength(2);
      const critical = violationAlerts.find(a => a.title === 'Critical Breach');
      expect(critical).toBeDefined();
      expect(critical?.severity).toBe(Severity.CRITICAL);
      expect(critical?.url).toMatch(/^\/violations\//);

      const low = violationAlerts.find(a => a.title === 'Minor Issue');
      expect(low).toBeDefined();
      expect(low?.severity).toBe(Severity.LOW);
    });

    it('flags stale draft treatments older than 30 days', async () => {
      const user = await seedUser();
      const fiftyDaysAgo = new Date();
      fiftyDaysAgo.setDate(fiftyDaysAgo.getDate() - STALE_DAYS_AGO);

      // Create a DRAFT treatment and manually set updatedAt to 50 days ago
      const treatment = await prisma.treatment.create({
        data: {
          name: 'Stale Draft Treatment',
          createdBy: user.id,
          status: 'DRAFT',
        },
      });
      await prisma.$executeRaw`UPDATE treatments SET "updatedAt" = ${fiftyDaysAgo} WHERE id = ${treatment.id}`;

      const result = await service.getAlerts();
      const overdueAlerts = result.items.filter(i => i.type === ALERT_TYPE_TREATMENT_OVERDUE);

      expect(overdueAlerts).toHaveLength(1);
      expect(overdueAlerts[0].title).toBe('Stale Draft Treatment');
      expect(overdueAlerts[0].severity).toBe(Severity.HIGH);
      expect(overdueAlerts[0].url).toBe(`/register/${treatment.id}`);
    });

    it('flags checklist NO answers', async () => {
      const user = await seedUser();
      await prisma.checklistResponse.create({
        data: {
          itemId: 'art6_legal_basis',
          response: ChecklistAnswer.NO,
          respondedBy: user.id,
        },
      });
      await prisma.checklistResponse.create({
        data: {
          itemId: 'art13_information',
          response: ChecklistAnswer.YES,
          respondedBy: user.id,
        },
      });

      const result = await service.getAlerts();
      const checklistAlerts = result.items.filter(
        i => i.type === ALERT_TYPE_CHECKLIST_NON_COMPLIANT,
      );

      expect(checklistAlerts).toHaveLength(1);
      expect(checklistAlerts[0].severity).toBe(Severity.MEDIUM);
      expect(checklistAlerts[0].url).toBe('/governance');
    });

    it('flags DSR nearing deadline (within 7 days)', async () => {
      const user = await seedUser();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + DSR_DAYS_AHEAD);

      await prisma.dataSubjectRequest.create({
        data: {
          type: 'ACCESS',
          status: 'IN_PROGRESS',
          requesterName: 'Jane Doe',
          requesterEmail: 'jane@example.com',
          deadline: threeDaysFromNow,
          createdBy: user.id,
        },
      });

      const result = await service.getAlerts();
      const dsrAlerts = result.items.filter(i => i.type === ALERT_TYPE_DSR_DEADLINE);

      expect(dsrAlerts).toHaveLength(1);
      expect(dsrAlerts[0].severity).toBe(Severity.HIGH);
      expect(dsrAlerts[0].title).toBe('DSR from Jane Doe');
      expect(dsrAlerts[0].url).toMatch(/^\/dsr\//);
    });

    it('sorts by severity then due date', async () => {
      const user = await seedUser();

      // Create a past-deadline DSR (CRITICAL)
      // receivedAt is set 30 days before deadline so the engine computes the same overdue anchor.
      const pastDeadline = new Date();
      pastDeadline.setDate(pastDeadline.getDate() - PAST_DEADLINE_DAYS);
      const pastReceivedAt = new Date(pastDeadline);
      pastReceivedAt.setDate(pastReceivedAt.getDate() - DSR_STANDARD_DAYS);
      await prisma.dataSubjectRequest.create({
        data: {
          type: 'ACCESS',
          status: 'RECEIVED',
          requesterName: 'Past DSR',
          requesterEmail: 'past@example.com',
          receivedAt: pastReceivedAt,
          deadline: pastDeadline,
          createdBy: user.id,
        },
      });

      // Create a near-deadline DSR (HIGH)
      // receivedAt is set 30 days before deadline so the engine computes the same anchor.
      const nearDeadline = new Date();
      nearDeadline.setDate(nearDeadline.getDate() + NEAR_DEADLINE_DAYS);
      const nearReceivedAt = new Date(nearDeadline);
      nearReceivedAt.setDate(nearReceivedAt.getDate() - DSR_STANDARD_DAYS);
      await prisma.dataSubjectRequest.create({
        data: {
          type: 'ERASURE',
          status: 'IN_PROGRESS',
          requesterName: 'Near DSR',
          requesterEmail: 'near@example.com',
          receivedAt: nearReceivedAt,
          deadline: nearDeadline,
          createdBy: user.id,
        },
      });

      // Create a checklist NO answer (MEDIUM)
      await prisma.checklistResponse.create({
        data: {
          itemId: 'art6_legal_basis',
          response: ChecklistAnswer.NO,
          respondedBy: user.id,
        },
      });

      // Create a LOW violation
      await prisma.violation.create({
        data: {
          title: 'Low Violation',
          severity: Severity.LOW,
          awarenessAt: new Date(),
          createdBy: user.id,
        },
      });

      const result = await service.getAlerts();

      expect(result.items.length).toBeGreaterThanOrEqual(MIN_ALERT_COUNT);
      // CRITICAL items first
      expect(result.items[0].severity).toBe(Severity.CRITICAL);
      // LOW items last
      expect(result.items.at(-1)?.severity).toBe(Severity.LOW);

      // Verify overall ordering: CRITICAL <= HIGH <= MEDIUM <= LOW
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      for (let i = 1; i < result.items.length; i++) {
        const prev = severityOrder[result.items[i - 1].severity];
        const curr = severityOrder[result.items[i].severity];
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });
  });
});
