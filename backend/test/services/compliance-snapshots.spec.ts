import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { ChecklistAnswer } from '@article30/shared';
import { ComplianceService } from '../../src/modules/compliance/compliance.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const SNAPSHOT_TREATMENTS_TOTAL = 10;
const SNAPSHOT_CHECKLIST_TOTAL = 15;
const EXPECTED_COUNT = 3;
const SNAPSHOT_SCORE_LOW = 50;
const SNAPSHOT_SCORE_MID = 60;
const SNAPSHOT_SCORE_HIGH = 75;

describe('ComplianceService (snapshots)', () => {
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

  describe('createSnapshot()', () => {
    it('persists current score as a snapshot', async () => {
      const user = await seedUser();

      // Seed some data so score is non-zero
      await prisma.checklistResponse.create({
        data: {
          itemId: 'art33-breach',
          response: ChecklistAnswer.YES,
          respondedBy: user.id,
        },
      });

      const snapshot = await service.createSnapshot();

      expect(snapshot.id).toBeDefined();
      expect(snapshot.score).toBeGreaterThan(0);
      expect(snapshot.snapshotDate).toBeInstanceOf(Date);
      expect(snapshot.checklistScore).toBeGreaterThanOrEqual(0);
      expect(snapshot.freshnessScore).toBeGreaterThanOrEqual(0);
      expect(snapshot.violationScore).toBeGreaterThanOrEqual(0);

      // Verify it was persisted
      const persisted = await prisma.complianceSnapshot.findUnique({
        where: { id: snapshot.id },
      });
      expect(persisted).not.toBeNull();
      expect(persisted?.score).toBe(snapshot.score);
    });
  });

  describe('getSnapshots()', () => {
    it('returns snapshots ordered by snapshotDate desc', async () => {
      // Create snapshots with different dates
      await prisma.complianceSnapshot.create({
        data: {
          score: SNAPSHOT_SCORE_LOW,
          checklistScore: 60,
          freshnessScore: 40,
          violationScore: 80,
          treatmentsTotal: SNAPSHOT_TREATMENTS_TOTAL,
          treatmentsValidated: 4,
          checklistCompleted: 9,
          checklistTotal: SNAPSHOT_CHECKLIST_TOTAL,
          openViolations: 2,
          snapshotDate: new Date('2026-01-01'),
        },
      });

      await prisma.complianceSnapshot.create({
        data: {
          score: SNAPSHOT_SCORE_HIGH,
          checklistScore: 80,
          freshnessScore: 70,
          violationScore: 90,
          treatmentsTotal: SNAPSHOT_TREATMENTS_TOTAL,
          treatmentsValidated: 7,
          checklistCompleted: 12,
          checklistTotal: SNAPSHOT_CHECKLIST_TOTAL,
          openViolations: 1,
          snapshotDate: new Date('2026-03-01'),
        },
      });

      await prisma.complianceSnapshot.create({
        data: {
          score: SNAPSHOT_SCORE_MID,
          checklistScore: 65,
          freshnessScore: 55,
          violationScore: 85,
          treatmentsTotal: SNAPSHOT_TREATMENTS_TOTAL,
          treatmentsValidated: 5,
          checklistCompleted: 10,
          checklistTotal: SNAPSHOT_CHECKLIST_TOTAL,
          openViolations: 1,
          snapshotDate: new Date('2026-02-01'),
        },
      });

      const snapshots = await service.getSnapshots();

      expect(snapshots.length).toBe(EXPECTED_COUNT);
      // Most recent first
      expect(snapshots[0].score).toBe(SNAPSHOT_SCORE_HIGH);
      expect(snapshots[1].score).toBe(SNAPSHOT_SCORE_MID);
      expect(snapshots[2].score).toBe(SNAPSHOT_SCORE_LOW);
      expect(snapshots[0].snapshotDate.getTime()).toBeGreaterThan(
        snapshots[1].snapshotDate.getTime(),
      );
      expect(snapshots[1].snapshotDate.getTime()).toBeGreaterThan(
        snapshots[2].snapshotDate.getTime(),
      );
    });
  });
});
