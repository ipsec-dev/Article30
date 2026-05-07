import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { TreatmentStatus, LegalBasis, Role, VALIDATE_ROLES } from '@article30/shared';
import { TreatmentsService } from '../../src/modules/treatments/treatments.service';
import { PdfExportService } from '../../src/modules/treatments/pdf-export.service';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { CreateTreatmentDto } from '../../src/modules/treatments/dto/create-treatment.dto';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const DEFAULT_FRESHNESS_THRESHOLD = 6;
const DEFAULT_REVIEW_CYCLE = 12;
const EXPECTED_COUNT = 3;
const DEFAULT_PAGE_SIZE = 20;
const NAME_T1 = 'T1';
const NAME_T2 = 'T2';
const EMAIL_VALIDATOR = 'validator@example.com';
const NAME_VALIDATOR = 'Validator';
const UUID_ZERO = '00000000-0000-0000-0000-000000000000';
const IT_THROWS_NOT_FOUND = 'throws NotFoundException for unknown id';

describe('TreatmentsService – CRUD Basic & State', () => {
  let module: TestingModule;
  let service: TreatmentsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        TreatmentsService,
        PdfExportService,
        {
          provide: AuditLogService,
          useValue: { create: vi.fn().mockResolvedValue({ hash: 'a'.repeat(64) }) },
        },
      ],
    }).compile();

    service = module.get(TreatmentsService);
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

  async function seedOrganization(
    overrides: Partial<{
      freshnessThresholdMonths: number;
      reviewCycleMonths: number;
      companyName: string;
    }> = {},
  ) {
    return prisma.organization.create({
      data: {
        slug: `test-org-${Date.now()}`,
        companyName: overrides.companyName ?? 'Test Company',
        freshnessThresholdMonths: overrides.freshnessThresholdMonths ?? DEFAULT_FRESHNESS_THRESHOLD,
        reviewCycleMonths: overrides.reviewCycleMonths ?? DEFAULT_REVIEW_CYCLE,
      },
    });
  }

  function createTreatment(userId: string, overrides: Partial<CreateTreatmentDto> = {}) {
    return service.create(
      {
        name: overrides.name ?? 'Test Treatment',
        purpose: overrides.purpose,
        legalBasis: overrides.legalBasis,
        personCategories: overrides.personCategories,
        dataCategories: overrides.dataCategories,
        hasSensitiveData: overrides.hasSensitiveData,
        sensitiveCategories: overrides.sensitiveCategories,
        recipients: overrides.recipients,
        transfers: overrides.transfers,
        retentionPeriod: overrides.retentionPeriod,
        securityMeasures: overrides.securityMeasures,
        securityMeasuresDetailed: overrides.securityMeasuresDetailed,
        hasEvaluationScoring: overrides.hasEvaluationScoring,
        hasAutomatedDecisions: overrides.hasAutomatedDecisions,
        hasSystematicMonitoring: overrides.hasSystematicMonitoring,
        isLargeScale: overrides.isLargeScale,
        hasCrossDatasetLinking: overrides.hasCrossDatasetLinking,
        involvesVulnerablePersons: overrides.involvesVulnerablePersons,
        usesInnovativeTech: overrides.usesInnovativeTech,
        canExcludeFromRights: overrides.canExcludeFromRights,
      },
      userId,
    );
  }

  describe('create()', () => {
    it('assigns sequential refNumber starting at 1', async () => {
      const user = await seedUser();
      await seedOrganization();

      const t1 = await createTreatment(user.id, { name: 'First' });
      const t2 = await createTreatment(user.id, { name: 'Second' });
      const t3 = await createTreatment(user.id, { name: 'Third' });

      expect(t1.refNumber).toBe(1);
      expect(t2.refNumber).toBe(2);
      expect(t3.refNumber).toBe(EXPECTED_COUNT);
    });

    it('returns computed indicators when organization exists', async () => {
      const user = await seedUser();
      await seedOrganization();

      const treatment = await createTreatment(user.id);

      expect(treatment.indicators).toBeDefined();
      expect(treatment.indicators).not.toBeNull();
      expect(treatment.indicators?.riskLevel).toBeDefined();
      expect(treatment.indicators?.completenessScore).toBeGreaterThanOrEqual(0);
      expect(treatment.indicators?.freshnessStatus).toBeDefined();
    });

    it('returns null indicators when no organization exists', async () => {
      const user = await seedUser();
      // No organization seeded

      const treatment = await createTreatment(user.id);

      expect(treatment.indicators).toBeNull();
    });

    it('sets createdBy to the given userId', async () => {
      const user = await seedUser();
      await seedOrganization();

      const treatment = await createTreatment(user.id);

      expect(treatment.createdBy).toBe(user.id);
    });

    it('initial status is DRAFT', async () => {
      const user = await seedUser();
      await seedOrganization();

      const treatment = await createTreatment(user.id);

      expect(treatment.status).toBe(TreatmentStatus.DRAFT);
    });
  });

  describe('update()', () => {
    it('updates name field and returns updated treatment', async () => {
      const user = await seedUser();
      await seedOrganization();
      const created = await createTreatment(user.id, { name: 'Original Name' });

      const updated = await service.update(created.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
    });

    it('updates purpose and legalBasis fields', async () => {
      const user = await seedUser();
      await seedOrganization();
      const created = await createTreatment(user.id);

      const updated = await service.update(created.id, {
        purpose: 'New purpose',
        legalBasis: LegalBasis.CONSENT,
      });

      expect(updated.purpose).toBe('New purpose');
      expect(updated.legalBasis).toBe('CONSENT');
    });

    it(IT_THROWS_NOT_FOUND, async () => {
      await expect(service.update(UUID_ZERO, { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('deletes treatment and it is no longer findable', async () => {
      const user = await seedUser();
      await seedOrganization();
      const created = await createTreatment(user.id);

      await service.remove(created.id);

      await expect(service.findOne(created.id)).rejects.toThrow(NotFoundException);
    });

    it(IT_THROWS_NOT_FOUND, async () => {
      await expect(service.remove(UUID_ZERO)).rejects.toThrow(NotFoundException);
    });

    it('reduces total count after deletion', async () => {
      const user = await seedUser();
      await seedOrganization();
      await createTreatment(user.id, { name: NAME_T1 });
      const t2 = await createTreatment(user.id, { name: NAME_T2 });

      await service.remove(t2.id);
      const result = await service.findAll(1, DEFAULT_PAGE_SIZE);

      expect(result.total).toBe(1);
    });
  });

  describe('validate()', () => {
    it('sets status=VALIDATED, validatedBy and validatedAt', async () => {
      const user = await seedUser();
      const validator = await seedUser({ email: EMAIL_VALIDATOR, name: NAME_VALIDATOR });
      await seedOrganization();
      const created = await createTreatment(user.id);

      const before = new Date();
      const validated = await service.validate(created.id, validator.id);
      const after = new Date();

      expect(validated.status).toBe(TreatmentStatus.VALIDATED);
      expect(validated.validatedBy).toBe(validator.id);
      expect(validated.validatedAt).toBeDefined();
      expect(validated.validatedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(validated.validatedAt?.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('throws ForbiddenException if already validated', async () => {
      const user = await seedUser();
      const validator = await seedUser({ email: EMAIL_VALIDATOR, name: NAME_VALIDATOR });
      await seedOrganization();
      const created = await createTreatment(user.id);

      await service.validate(created.id, validator.id);

      await expect(service.validate(created.id, validator.id)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('invalidate()', () => {
    it('reverts status to DRAFT and clears validatedBy/validatedAt', async () => {
      const user = await seedUser();
      const validator = await seedUser({ email: EMAIL_VALIDATOR, name: NAME_VALIDATOR });
      await seedOrganization();
      const created = await createTreatment(user.id);
      await service.validate(created.id, validator.id);

      const invalidated = await service.invalidate(created.id, validator.id);

      expect(invalidated.status).toBe(TreatmentStatus.DRAFT);
      expect(invalidated.validatedBy).toBeNull();
      expect(invalidated.validatedAt).toBeNull();
    });

    it('throws ForbiddenException if already in DRAFT', async () => {
      const user = await seedUser();
      const validator = await seedUser({ email: EMAIL_VALIDATOR, name: NAME_VALIDATOR });
      await seedOrganization();
      const created = await createTreatment(user.id);

      await expect(service.invalidate(created.id, validator.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('markReviewed()', () => {
    it('sets lastReviewedAt to now and nextReviewAt to now + reviewCycleMonths', async () => {
      const user = await seedUser();
      await seedOrganization({ reviewCycleMonths: DEFAULT_REVIEW_CYCLE });
      const created = await createTreatment(user.id);

      const before = new Date();
      const result = await service.markReviewed(created.id);
      const after = new Date();

      expect(result.lastReviewedAt).toBeDefined();
      expect(result.lastReviewedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.lastReviewedAt?.getTime()).toBeLessThanOrEqual(after.getTime());

      expect(result.nextReviewAt).toBeDefined();
      // nextReviewAt should be approximately 12 months after now
      const expectedNextMin = new Date(before);
      expectedNextMin.setMonth(expectedNextMin.getMonth() + DEFAULT_REVIEW_CYCLE);
      const expectedNextMax = new Date(after);
      expectedNextMax.setMonth(expectedNextMax.getMonth() + DEFAULT_REVIEW_CYCLE);
      expect(result.nextReviewAt?.getTime()).toBeGreaterThanOrEqual(expectedNextMin.getTime());
      expect(result.nextReviewAt?.getTime()).toBeLessThanOrEqual(expectedNextMax.getTime());
    });

    it('returns indicators with freshness FRESH after marking reviewed', async () => {
      const user = await seedUser();
      await seedOrganization({
        freshnessThresholdMonths: DEFAULT_FRESHNESS_THRESHOLD,
        reviewCycleMonths: DEFAULT_REVIEW_CYCLE,
      });
      const created = await createTreatment(user.id);

      const result = await service.markReviewed(created.id);

      expect(result.indicators).toBeDefined();
      expect(result.indicators?.freshnessStatus).toBe('FRESH');
    });

    it('throws NotFoundException when no organization exists', async () => {
      const user = await seedUser();
      // No organization seeded
      const created = await createTreatment(user.id);

      await expect(service.markReviewed(created.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportCsv()', () => {
    it('returns a string containing CSV headers', async () => {
      const user = await seedUser();
      await seedOrganization();
      await createTreatment(user.id);

      const csv = await service.exportCsv();

      expect(typeof csv).toBe('string');
      expect(csv).toContain('Name');
      expect(csv).toContain('Purpose');
      expect(csv).toContain('Legal Basis');
      expect(csv).toContain('Status');
      expect(csv).toContain('Created At');
    });

    it('includes treatment data in CSV rows', async () => {
      const user = await seedUser();
      await seedOrganization();
      await createTreatment(user.id, { name: 'My Special Treatment' });

      const csv = await service.exportCsv();

      expect(csv).toContain('My Special Treatment');
    });

    it('returns CSV with correct number of rows (header + data)', async () => {
      const user = await seedUser();
      await seedOrganization();
      await createTreatment(user.id, { name: NAME_T1 });
      await createTreatment(user.id, { name: NAME_T2 });

      const csv = await service.exportCsv();
      const lines = csv.split('\n');

      // 1 header row + 2 data rows
      expect(lines.length).toBe(EXPECTED_COUNT);
    });

    it('returns only header row when no treatments exist', async () => {
      const csv = await service.exportCsv();
      const lines = csv.split('\n');

      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('Name');
    });

    it('CSV values containing special chars are quoted and escaped', async () => {
      const user = await seedUser();
      await seedOrganization();
      await createTreatment(user.id, { name: 'Name, with "quotes"' });

      const csv = await service.exportCsv();

      expect(csv).toContain('"Name, with ""quotes"""');
    });
  });
});

describe('VALIDATE_ROLES constant', () => {
  it('includes ADMIN and DPO exactly', () => {
    expect([...VALIDATE_ROLES].sort()).toEqual([Role.ADMIN, Role.DPO].sort());
  });
});
