import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
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
const NAME_T3 = 'T3';
const UUID_ZERO = '00000000-0000-0000-0000-000000000000';
const IT_THROWS_NOT_FOUND = 'throws NotFoundException for unknown id';

describe('TreatmentsService – CRUD Query', () => {
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

  describe('findAll()', () => {
    it('returns paginated results (create 3, page=1 limit=2 → data.length=2, total=3)', async () => {
      const user = await seedUser();
      await seedOrganization();
      await createTreatment(user.id, { name: NAME_T1 });
      await createTreatment(user.id, { name: NAME_T2 });
      await createTreatment(user.id, { name: NAME_T3 });

      const result = await service.findAll(1, 2);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(EXPECTED_COUNT);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('second page returns remaining treatment', async () => {
      const user = await seedUser();
      await seedOrganization();
      await createTreatment(user.id, { name: NAME_T1 });
      await createTreatment(user.id, { name: NAME_T2 });
      await createTreatment(user.id, { name: NAME_T3 });

      const result = await service.findAll(2, 2);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(EXPECTED_COUNT);
      expect(result.page).toBe(2);
    });

    it('returns treatments with indicators when organization exists', async () => {
      const user = await seedUser();
      await seedOrganization();
      await createTreatment(user.id);

      const result = await service.findAll(1, DEFAULT_PAGE_SIZE);

      expect(result.data.length).toBe(1);
      expect(result.data[0].indicators).toBeDefined();
      expect(result.data[0].indicators).not.toBeNull();
    });

    it('results are ordered by refNumber ascending', async () => {
      const user = await seedUser();
      await seedOrganization();
      await createTreatment(user.id, { name: 'Alpha' });
      await createTreatment(user.id, { name: 'Beta' });
      await createTreatment(user.id, { name: 'Gamma' });

      const result = await service.findAll(1, DEFAULT_PAGE_SIZE);

      const refNumbers = result.data.map(t => t.refNumber);
      expect(refNumbers).toEqual([1, 2, EXPECTED_COUNT]);
    });
  });

  describe('findOne()', () => {
    it('returns treatment with indicators', async () => {
      const user = await seedUser();
      await seedOrganization();
      const created = await createTreatment(user.id);

      const found = await service.findOne(created.id);

      expect(found.id).toBe(created.id);
      expect(found.name).toBe(created.name);
      expect(found.indicators).toBeDefined();
      expect(found.indicators).not.toBeNull();
    });

    it('includes creator relation', async () => {
      const user = await seedUser();
      await seedOrganization();
      const created = await createTreatment(user.id);

      const found = await service.findOne(created.id);

      expect(found.creator).toBeDefined();
      expect(found.creator?.id).toBe(user.id);
    });

    it(IT_THROWS_NOT_FOUND, async () => {
      await expect(service.findOne(UUID_ZERO)).rejects.toThrow(NotFoundException);
    });
  });
});
