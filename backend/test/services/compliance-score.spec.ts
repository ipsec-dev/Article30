import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { ChecklistAnswer, Severity, VALID_CHECKLIST_ITEM_IDS } from '@article30/shared';
import { ComplianceService } from '../../src/modules/compliance/compliance.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const CHECKLIST_TOTAL = VALID_CHECKLIST_ITEM_IDS.length;
const TOTAL_PENALTIES = 30;
const VIOLATION_SCORE = 70;
const EXPECTED_COUNT = 3;
const CHECKLIST_TWO_ANSWERED_SCORE = (2 / CHECKLIST_TOTAL) * 100;
const TWO_OF_THREE_FRESHNESS_SCORE = 66.67;

describe('ComplianceService (score)', () => {
  let module: TestingModule;
  let service: ComplianceService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [ComplianceService],
    }).compile();

    service = module.get(ComplianceService);
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

  describe('computeScore()', () => {
    it('returns 0 when no data exists', async () => {
      const result = await service.computeScore();

      // Headline score is forced to 0 when nothing has been entered (the
      // breakdown values below are computed but the early-return makes the
      // dashboard say "0%" rather than synthesising a 60% from sub-defaults).
      expect(result.score).toBe(0);
      expect(result.breakdown.checklist.answered).toBe(0);
      expect(result.breakdown.checklist.total).toBe(CHECKLIST_TOTAL);
      // Freshness defaults to 100 when there are no treatments — see
      // computeFreshnessScore comment for why.
      expect(result.breakdown.freshness.score).toBe(100);
      expect(result.breakdown.freshness.validated).toBe(0);
      expect(result.breakdown.freshness.total).toBe(0);
      expect(result.breakdown.violations.penalties).toBe(0);
    });

    it('keeps freshness at 100 when checklist has answers but no treatments are registered yet', async () => {
      const user = await seedUser();
      // Org started filling in the governance checklist but hasn't logged
      // any treatments — the freshness band must NOT drag the score down.
      await prisma.checklistResponse.create({
        data: {
          itemId: 'art33-breach',
          response: ChecklistAnswer.YES,
          respondedBy: user.id,
        },
      });

      const result = await service.computeScore();

      expect(result.breakdown.freshness.total).toBe(0);
      expect(result.breakdown.freshness.score).toBe(100);
    });

    it('excludes REMEDIATED and CLOSED violations from the score', async () => {
      const user = await seedUser();

      await prisma.violation.create({
        data: {
          title: 'Past incident closed',
          severity: Severity.CRITICAL,
          status: 'CLOSED',
          awarenessAt: new Date(),
          createdBy: user.id,
        },
      });
      await prisma.violation.create({
        data: {
          title: 'Past incident remediated',
          severity: Severity.HIGH,
          status: 'REMEDIATED',
          awarenessAt: new Date(),
          createdBy: user.id,
        },
      });
      await prisma.violation.create({
        data: {
          title: 'Active incident',
          severity: Severity.MEDIUM,
          status: 'CONTAINED',
          awarenessAt: new Date(),
          createdBy: user.id,
        },
      });

      const result = await service.computeScore();

      // Only the active MEDIUM violation should apply: 5 penalty.
      expect(result.breakdown.violations.penalties).toBe(5);
      expect(result.breakdown.violations.openByLevel).toEqual({
        MEDIUM: 1,
        HIGH: 0,
        CRITICAL: 0,
      });
    });

    it('counts YES and NA-with-reason as answered checklist items', async () => {
      const user = await seedUser();

      // YES counts
      await prisma.checklistResponse.create({
        data: {
          itemId: 'art33-breach',
          response: ChecklistAnswer.YES,
          respondedBy: user.id,
        },
      });

      // NA with reason counts
      await prisma.checklistResponse.create({
        data: {
          itemId: 'art34-communication',
          response: ChecklistAnswer.NA,
          reason: 'Not applicable to our org',
          respondedBy: user.id,
        },
      });

      // NA without reason does NOT count
      await prisma.checklistResponse.create({
        data: {
          itemId: 'art25-design',
          response: ChecklistAnswer.NA,
          respondedBy: user.id,
        },
      });

      // NO does NOT count
      await prisma.checklistResponse.create({
        data: {
          itemId: 'art25-default',
          response: ChecklistAnswer.NO,
          respondedBy: user.id,
        },
      });

      const result = await service.computeScore();

      expect(result.breakdown.checklist.answered).toBe(2);
      expect(result.breakdown.checklist.total).toBe(CHECKLIST_TOTAL);
      expect(result.breakdown.checklist.score).toBeCloseTo(CHECKLIST_TWO_ANSWERED_SCORE, 1);
    });

    it('computes freshness score from validated/total treatments', async () => {
      const user = await seedUser();

      // 2 validated, 1 draft => freshness = (2/3) * 100
      await prisma.treatment.create({
        data: {
          name: 'T1',
          status: 'VALIDATED',
          createdBy: user.id,
        },
      });
      await prisma.treatment.create({
        data: {
          name: 'T2',
          status: 'VALIDATED',
          createdBy: user.id,
        },
      });
      await prisma.treatment.create({
        data: {
          name: 'T3',
          status: 'DRAFT',
          createdBy: user.id,
        },
      });

      const result = await service.computeScore();

      expect(result.breakdown.freshness.validated).toBe(2);
      expect(result.breakdown.freshness.total).toBe(EXPECTED_COUNT);
      expect(result.breakdown.freshness.score).toBeCloseTo(TWO_OF_THREE_FRESHNESS_SCORE, 1);
    });

    it('applies violation penalties correctly by severity', async () => {
      const user = await seedUser();

      // LOW => no penalty
      await prisma.violation.create({
        data: {
          title: 'Low issue',
          severity: Severity.LOW,
          awarenessAt: new Date(),
          createdBy: user.id,
        },
      });

      // MEDIUM => -5
      await prisma.violation.create({
        data: {
          title: 'Medium issue',
          severity: Severity.MEDIUM,
          awarenessAt: new Date(),
          createdBy: user.id,
        },
      });

      // HIGH => -10
      await prisma.violation.create({
        data: {
          title: 'High issue',
          severity: Severity.HIGH,
          awarenessAt: new Date(),
          createdBy: user.id,
        },
      });

      // CRITICAL => -15
      await prisma.violation.create({
        data: {
          title: 'Critical issue',
          severity: Severity.CRITICAL,
          awarenessAt: new Date(),
          createdBy: user.id,
        },
      });

      const result = await service.computeScore();

      // penalties = 5 + 10 + 15 = 30
      expect(result.breakdown.violations.penalties).toBe(TOTAL_PENALTIES);
      expect(result.breakdown.violations.score).toBe(VIOLATION_SCORE);
      expect(result.breakdown.violations.openByLevel).toEqual({
        MEDIUM: 1,
        HIGH: 1,
        CRITICAL: 1,
      });
    });
  });
});
