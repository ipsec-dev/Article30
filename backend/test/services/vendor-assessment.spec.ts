import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Role, VENDOR_ASSESSMENT_QUESTIONS } from '@article30/shared';
import { VendorAssessmentsService } from '../../src/modules/vendors/vendor-assessments.service';
import { NotificationService } from '../../src/modules/notifications/notification.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { noopNotificationService } from '../helpers/notification-stub';

// No-op NotificationService stub: this spec covers the existing pre-notify
// branches (validation, status guards, scoring). Notification side-effects
// are covered separately in test/notifications/vendor-questionnaire-returned.spec.ts.
const notificationsStub = noopNotificationService();

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR — test-only default

const BCRYPT_ROUNDS = 4;

const SCORE_FULL = 100;
const SCORE_HALF = 50;
const SCORE_ZERO = 0;
const SCORE_SINGLE_YES = 18;
const SCORE_MIXED = 56;

describe('VendorAssessmentsService — scoring', () => {
  // We test the pure computeScore method directly
  const service = Object.create(VendorAssessmentsService.prototype) as VendorAssessmentsService;

  it('should compute 100% when all answers are YES', () => {
    const answers = [
      { questionId: 'q1', answer: 'YES' as const },
      { questionId: 'q2', answer: 'YES' as const },
      { questionId: 'q3', answer: 'YES' as const },
      { questionId: 'q4', answer: 'YES' as const },
      { questionId: 'q5', answer: 'YES' as const },
      { questionId: 'q6', answer: 'YES' as const },
      { questionId: 'q7', answer: 'YES' as const },
      { questionId: 'q8', answer: 'YES' as const },
      { questionId: 'q9', answer: 'YES' as const },
      { questionId: 'q10', answer: 'YES' as const },
    ];
    expect(service.computeScore(answers)).toBe(SCORE_FULL);
  });

  it('should compute 0% when all answers are NO', () => {
    const answers = [
      { questionId: 'q1', answer: 'NO' as const },
      { questionId: 'q2', answer: 'NO' as const },
      { questionId: 'q3', answer: 'NO' as const },
      { questionId: 'q4', answer: 'NO' as const },
      { questionId: 'q5', answer: 'NO' as const },
      { questionId: 'q6', answer: 'NO' as const },
      { questionId: 'q7', answer: 'NO' as const },
      { questionId: 'q8', answer: 'NO' as const },
      { questionId: 'q9', answer: 'NO' as const },
      { questionId: 'q10', answer: 'NO' as const },
    ];
    expect(service.computeScore(answers)).toBe(SCORE_ZERO);
  });

  it('should compute 50% when all answers are PARTIAL', () => {
    const answers = [
      { questionId: 'q1', answer: 'PARTIAL' as const },
      { questionId: 'q2', answer: 'PARTIAL' as const },
      { questionId: 'q3', answer: 'PARTIAL' as const },
      { questionId: 'q4', answer: 'PARTIAL' as const },
      { questionId: 'q5', answer: 'PARTIAL' as const },
      { questionId: 'q6', answer: 'PARTIAL' as const },
      { questionId: 'q7', answer: 'PARTIAL' as const },
      { questionId: 'q8', answer: 'PARTIAL' as const },
      { questionId: 'q9', answer: 'PARTIAL' as const },
      { questionId: 'q10', answer: 'PARTIAL' as const },
    ];
    expect(service.computeScore(answers)).toBe(SCORE_HALF);
  });

  it('should exclude NA answers from scoring', () => {
    // q1 (weight 15) = YES, q2 (weight 15) = NA, rest = NO
    const answers = [
      { questionId: 'q1', answer: 'YES' as const },
      { questionId: 'q2', answer: 'NA' as const },
      { questionId: 'q3', answer: 'NO' as const },
      { questionId: 'q4', answer: 'NO' as const },
      { questionId: 'q5', answer: 'NO' as const },
      { questionId: 'q6', answer: 'NO' as const },
      { questionId: 'q7', answer: 'NO' as const },
      { questionId: 'q8', answer: 'NO' as const },
      { questionId: 'q9', answer: 'NO' as const },
      { questionId: 'q10', answer: 'NO' as const },
    ];
    // applicable = 100 - 15 = 85, earned = 15
    // score = round((15/85)*100) = round(17.647) = 18
    expect(service.computeScore(answers)).toBe(SCORE_SINGLE_YES);
  });

  it('should return 0 when all answers are NA', () => {
    const answers = [
      { questionId: 'q1', answer: 'NA' as const },
      { questionId: 'q2', answer: 'NA' as const },
      { questionId: 'q3', answer: 'NA' as const },
      { questionId: 'q4', answer: 'NA' as const },
      { questionId: 'q5', answer: 'NA' as const },
      { questionId: 'q6', answer: 'NA' as const },
      { questionId: 'q7', answer: 'NA' as const },
      { questionId: 'q8', answer: 'NA' as const },
      { questionId: 'q9', answer: 'NA' as const },
      { questionId: 'q10', answer: 'NA' as const },
    ];
    expect(service.computeScore(answers)).toBe(SCORE_ZERO);
  });

  it('should handle mixed answers correctly', () => {
    // q1 (15) YES, q2 (15) PARTIAL, q3 (15) NO, q4 (10) NA
    // rest: q5(10) YES, q6(10) YES, q7(10) NO, q8(5) PARTIAL, q9(5) YES, q10(5) NO
    const answers = [
      { questionId: 'q1', answer: 'YES' as const },
      { questionId: 'q2', answer: 'PARTIAL' as const },
      { questionId: 'q3', answer: 'NO' as const },
      { questionId: 'q4', answer: 'NA' as const },
      { questionId: 'q5', answer: 'YES' as const },
      { questionId: 'q6', answer: 'YES' as const },
      { questionId: 'q7', answer: 'NO' as const },
      { questionId: 'q8', answer: 'PARTIAL' as const },
      { questionId: 'q9', answer: 'YES' as const },
      { questionId: 'q10', answer: 'NO' as const },
    ];
    // applicable = 100 - 10 = 90
    // earned = 15 + 7.5 + 0 + 10 + 10 + 0 + 2.5 + 5 + 0 = 50
    // score = round((50/90)*100) = round(55.555) = 56
    expect(service.computeScore(answers)).toBe(SCORE_MIXED);
  });

  it('should return 0 when no answers provided', () => {
    expect(service.computeScore([])).toBe(SCORE_ZERO);
  });

  it('should ignore answers whose questionId is not in VENDOR_ASSESSMENT_QUESTIONS', () => {
    // Answer every known question YES, plus an unknown id → unknown id is ignored,
    // so score stays 100% (no crash, no contribution from the unknown answer).
    const answers = [
      ...VENDOR_ASSESSMENT_QUESTIONS.map(q => ({
        questionId: q.id,
        answer: 'YES' as const,
      })),
      { questionId: 'q-does-not-exist', answer: 'NO' as const },
    ];
    expect(service.computeScore(answers)).toBe(SCORE_FULL);
  });

  it('should compute 100% using VENDOR_ASSESSMENT_QUESTIONS ids (all YES)', () => {
    const answers = VENDOR_ASSESSMENT_QUESTIONS.map(q => ({
      questionId: q.id,
      answer: 'YES' as const,
    }));
    expect(service.computeScore(answers)).toBe(SCORE_FULL);
  });
});

describe('VendorAssessmentsService — DB-backed branches', () => {
  let module: TestingModule;
  let service: VendorAssessmentsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        VendorAssessmentsService,
        { provide: NotificationService, useValue: notificationsStub },
      ],
    }).compile();

    service = module.get(VendorAssessmentsService);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await module.close();
  });

  async function seedUser(email = 'assessment-user@example.test') {
    const hashedPassword = await bcrypt.hash('password', BCRYPT_ROUNDS);
    return prisma.user.create({
      data: {
        firstName: 'Assessment',
        lastName: 'User',
        email,
        password: hashedPassword,
        role: Role.ADMIN,
        approved: true,
      },
    });
  }

  async function seedVendor(createdBy: string, name = 'Acme Cloud') {
    return prisma.vendor.create({
      data: { name, createdBy },
    });
  }

  async function seedAssessment(
    vendorId: string,
    createdBy: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' = 'PENDING',
  ) {
    return prisma.vendorAssessment.create({
      data: {
        vendorId,
        createdBy,
        status,
        answers: [],
      },
    });
  }

  describe('findByVendor', () => {
    it('returns null when no assessment exists for the vendorId', async () => {
      const user = await seedUser();
      const vendor = await seedVendor(user.id);

      const result = await service.findByVendor(vendor.id);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when assessment id does not exist', async () => {
      await expect(service.update('00000000-0000-0000-0000-000000000000', [])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when updating an APPROVED assessment', async () => {
      const user = await seedUser();
      const vendor = await seedVendor(user.id);
      const assessment = await seedAssessment(vendor.id, user.id, 'APPROVED');

      await expect(service.update(assessment.id, [])).rejects.toThrow(
        new ForbiddenException('Cannot update a reviewed assessment'),
      );
    });

    it('throws ForbiddenException when updating a REJECTED assessment', async () => {
      const user = await seedUser();
      const vendor = await seedVendor(user.id);
      const assessment = await seedAssessment(vendor.id, user.id, 'REJECTED');

      await expect(service.update(assessment.id, [])).rejects.toThrow(
        new ForbiddenException('Cannot update a reviewed assessment'),
      );
    });
  });

  describe('submit', () => {
    it('throws NotFoundException when assessment id does not exist', async () => {
      await expect(service.submit('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when submitting an already-SUBMITTED assessment', async () => {
      const user = await seedUser();
      const vendor = await seedVendor(user.id);
      const assessment = await seedAssessment(vendor.id, user.id, 'SUBMITTED');

      await expect(service.submit(assessment.id)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when submitting an APPROVED assessment', async () => {
      const user = await seedUser();
      const vendor = await seedVendor(user.id);
      const assessment = await seedAssessment(vendor.id, user.id, 'APPROVED');

      await expect(service.submit(assessment.id)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('review', () => {
    it('throws NotFoundException when assessment id does not exist', async () => {
      const user = await seedUser();

      await expect(
        service.review('00000000-0000-0000-0000-000000000000', 'APPROVED', undefined, user.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when reviewing a non-SUBMITTED assessment', async () => {
      const user = await seedUser();
      const vendor = await seedVendor(user.id);
      const assessment = await seedAssessment(vendor.id, user.id, 'IN_PROGRESS');

      await expect(
        service.review(assessment.id, 'APPROVED', 'looks good', user.id),
      ).rejects.toThrow(new ForbiddenException('Only submitted assessments can be reviewed'));
    });

    it('persists reviewNotes as null when reviewNotes is undefined', async () => {
      const user = await seedUser();
      const vendor = await seedVendor(user.id);
      const assessment = await seedAssessment(vendor.id, user.id, 'SUBMITTED');

      const reviewed = await service.review(assessment.id, 'APPROVED', undefined, user.id);

      expect(reviewed.reviewNotes).toBeNull();
      expect(reviewed.status).toBe('APPROVED');
      expect(reviewed.reviewedBy).toBe(user.id);
      expect(reviewed.reviewedAt).toBeInstanceOf(Date);

      const row = await prisma.vendorAssessment.findUnique({ where: { id: assessment.id } });
      expect(row?.reviewNotes).toBeNull();
    });
  });
});
