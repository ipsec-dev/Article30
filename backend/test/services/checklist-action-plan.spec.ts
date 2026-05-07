import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { ChecklistAnswer, Priority } from '@article30/shared';
import { ChecklistService } from '../../src/modules/checklist/checklist.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const REVIEW_INTERVAL_MONTHS = 12;
const ITEM_LAWFULNESS = 'art33-breach';

describe('ChecklistService – action plan & review dates', () => {
  let module: TestingModule;
  let service: ChecklistService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [ChecklistService],
    }).compile();

    service = module.get(ChecklistService);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await module.close();
  });

  async function seedUser(
    overrides: { email?: string; firstName?: string; lastName?: string } = {},
  ) {
    const hashedPassword = await bcrypt.hash('password', BCRYPT_ROUNDS);
    return prisma.user.create({
      data: {
        firstName: overrides.firstName ?? 'Test',
        lastName: overrides.lastName ?? 'User',
        email: overrides.email ?? 'user@example.com',
        password: hashedPassword,
        role: 'ADMIN',
        approved: true,
      },
    });
  }

  describe('upsert() – action plan fields', () => {
    it('stores action plan fields on upsert', async () => {
      const user = await seedUser();
      const assignee = await seedUser({ email: 'assignee@example.com', firstName: 'Assignee' });

      const result = await service.upsert(
        ITEM_LAWFULNESS,
        {
          response: ChecklistAnswer.NO,
          reason: 'Not yet compliant',
          actionPlan: 'Implement consent mechanism by Q3',
          assignedTo: assignee.id,
          deadline: '2026-09-30T00:00:00.000Z',
          priority: Priority.HIGH,
        },
        user.id,
      );

      expect(result.actionPlan).toBe('Implement consent mechanism by Q3');
      expect(result.assignedTo).toBe(assignee.id);
      expect(result.deadline).toBeInstanceOf(Date);
      expect(result.deadline?.toISOString()).toBe('2026-09-30T00:00:00.000Z');
      expect(result.priority).toBe(Priority.HIGH);
    });

    it('auto-sets lastReviewedAt and nextReviewAt (12 months apart)', async () => {
      const user = await seedUser();
      const before = new Date();

      const result = await service.upsert(
        ITEM_LAWFULNESS,
        { response: ChecklistAnswer.YES },
        user.id,
      );

      const after = new Date();

      expect(result.lastReviewedAt).toBeInstanceOf(Date);
      expect(result.nextReviewAt).toBeInstanceOf(Date);

      // lastReviewedAt should be within the test execution window
      expect(result.lastReviewedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.lastReviewedAt?.getTime()).toBeLessThanOrEqual(after.getTime());

      // nextReviewAt should be ~12 months after lastReviewedAt
      const lastReviewed = result.lastReviewedAt as Date;
      const nextReview = result.nextReviewAt as Date;
      const MONTHS_PER_YEAR = 12;
      const diffMonths =
        (nextReview.getFullYear() - lastReviewed.getFullYear()) * MONTHS_PER_YEAR +
        (nextReview.getMonth() - lastReviewed.getMonth());
      expect(diffMonths).toBe(REVIEW_INTERVAL_MONTHS);
    });

    it('accepts PARTIAL answer', async () => {
      const user = await seedUser();

      const result = await service.upsert(
        'art34-communication',
        { response: ChecklistAnswer.PARTIAL, reason: 'Work in progress' },
        user.id,
      );

      expect(result.response).toBe(ChecklistAnswer.PARTIAL);
      expect(result.reason).toBe('Work in progress');
    });

    it('accepts IN_PROGRESS answer', async () => {
      const user = await seedUser();

      const result = await service.upsert(
        'art25-design',
        { response: ChecklistAnswer.IN_PROGRESS, actionPlan: 'Data audit scheduled' },
        user.id,
      );

      expect(result.response).toBe(ChecklistAnswer.IN_PROGRESS);
      expect(result.actionPlan).toBe('Data audit scheduled');
    });
  });

  describe('findAll() – assignee relation', () => {
    it('includes assignee relation in results', async () => {
      const user = await seedUser();
      const assignee = await seedUser({
        email: 'assignee@example.com',
        firstName: 'Assignee',
        lastName: 'User',
      });

      await service.upsert(
        ITEM_LAWFULNESS,
        {
          response: ChecklistAnswer.NO,
          assignedTo: assignee.id,
          priority: Priority.MEDIUM,
        },
        user.id,
      );

      const results = await service.findAll();

      expect(results.length).toBe(1);
      expect(results[0].assignee).toBeDefined();
      expect(results[0].assignee?.id).toBe(assignee.id);
      expect(`${results[0].assignee?.firstName} ${results[0].assignee?.lastName}`).toBe(
        'Assignee User',
      );
    });
  });
});
