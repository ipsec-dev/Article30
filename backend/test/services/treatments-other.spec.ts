import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { RiskLevel, FreshnessStatus } from '@article30/shared';
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
const STALE_DAYS = 45;
const STALE_MONTHS = 3;
const EXPECTED_COUNT = 3;
const ALL_RISK_CRITERIA_COUNT = 9;

describe('TreatmentsService – Risk & Freshness', () => {
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

  describe('risk computation (via create/findOne indicators)', () => {
    it('treatment with 0 risk criteria → LOW risk, aipdRequired=false', async () => {
      const user = await seedUser();
      await seedOrganization();

      const treatment = await createTreatment(user.id, {
        hasEvaluationScoring: false,
        hasAutomatedDecisions: false,
        hasSystematicMonitoring: false,
        hasSensitiveData: false,
        isLargeScale: false,
        hasCrossDatasetLinking: false,
        involvesVulnerablePersons: false,
        usesInnovativeTech: false,
        canExcludeFromRights: false,
      });

      expect(treatment.indicators?.riskLevel).toBe(RiskLevel.LOW);
      expect(treatment.indicators?.riskCriteriaCount).toBe(0);
      expect(treatment.indicators?.aipdRequired).toBe(false);
    });

    it('treatment with 1 risk criterion → LOW risk, aipdRequired=false', async () => {
      const user = await seedUser();
      await seedOrganization();

      const treatment = await createTreatment(user.id, {
        hasEvaluationScoring: true,
        hasAutomatedDecisions: false,
        hasSystematicMonitoring: false,
        hasSensitiveData: false,
        isLargeScale: false,
        hasCrossDatasetLinking: false,
        involvesVulnerablePersons: false,
        usesInnovativeTech: false,
        canExcludeFromRights: false,
      });

      expect(treatment.indicators?.riskLevel).toBe(RiskLevel.LOW);
      expect(treatment.indicators?.riskCriteriaCount).toBe(1);
      expect(treatment.indicators?.aipdRequired).toBe(false);
    });

    it('treatment with 2 risk criteria → MEDIUM risk, aipdRequired=true', async () => {
      const user = await seedUser();
      await seedOrganization();

      const treatment = await createTreatment(user.id, {
        hasEvaluationScoring: true,
        hasAutomatedDecisions: true,
        hasSystematicMonitoring: false,
        hasSensitiveData: false,
        isLargeScale: false,
        hasCrossDatasetLinking: false,
        involvesVulnerablePersons: false,
        usesInnovativeTech: false,
        canExcludeFromRights: false,
      });

      expect(treatment.indicators?.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(treatment.indicators?.riskCriteriaCount).toBe(2);
      expect(treatment.indicators?.aipdRequired).toBe(true);
    });

    it('treatment with 3 risk criteria → MEDIUM risk, aipdRequired=true', async () => {
      const user = await seedUser();
      await seedOrganization();

      const treatment = await createTreatment(user.id, {
        hasEvaluationScoring: true,
        hasAutomatedDecisions: true,
        hasSystematicMonitoring: true,
        hasSensitiveData: false,
        isLargeScale: false,
        hasCrossDatasetLinking: false,
        involvesVulnerablePersons: false,
        usesInnovativeTech: false,
        canExcludeFromRights: false,
      });

      expect(treatment.indicators?.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(treatment.indicators?.riskCriteriaCount).toBe(EXPECTED_COUNT);
      expect(treatment.indicators?.aipdRequired).toBe(true);
    });

    it('treatment with 4 risk criteria → HIGH risk, aipdRequired=true', async () => {
      const user = await seedUser();
      await seedOrganization();

      const treatment = await createTreatment(user.id, {
        hasEvaluationScoring: true,
        hasAutomatedDecisions: true,
        hasSystematicMonitoring: true,
        hasSensitiveData: true,
        isLargeScale: false,
        hasCrossDatasetLinking: false,
        involvesVulnerablePersons: false,
        usesInnovativeTech: false,
        canExcludeFromRights: false,
      });

      expect(treatment.indicators?.riskLevel).toBe(RiskLevel.HIGH);
      expect(treatment.indicators?.riskCriteriaCount).toBe(4);
      expect(treatment.indicators?.aipdRequired).toBe(true);
    });

    it('treatment with all 9 risk criteria → HIGH risk, criteriaCount=9', async () => {
      const user = await seedUser();
      await seedOrganization();

      const treatment = await createTreatment(user.id, {
        hasEvaluationScoring: true,
        hasAutomatedDecisions: true,
        hasSystematicMonitoring: true,
        hasSensitiveData: true,
        isLargeScale: true,
        hasCrossDatasetLinking: true,
        involvesVulnerablePersons: true,
        usesInnovativeTech: true,
        canExcludeFromRights: true,
      });

      expect(treatment.indicators?.riskLevel).toBe(RiskLevel.HIGH);
      expect(treatment.indicators?.riskCriteriaCount).toBe(ALL_RISK_CRITERIA_COUNT);
      expect(treatment.indicators?.aipdRequired).toBe(true);
    });
  });

  describe('freshness computation (via indicators)', () => {
    it('treatment never reviewed → OUTDATED', async () => {
      const user = await seedUser();
      await seedOrganization();

      const treatment = await createTreatment(user.id);

      // lastReviewedAt is null → OUTDATED
      expect(treatment.indicators?.freshnessStatus).toBe(FreshnessStatus.OUTDATED);
    });

    it('treatment reviewed recently → FRESH', async () => {
      const user = await seedUser();
      await seedOrganization({
        freshnessThresholdMonths: DEFAULT_FRESHNESS_THRESHOLD,
        reviewCycleMonths: DEFAULT_REVIEW_CYCLE,
      });
      const created = await createTreatment(user.id);

      const result = await service.markReviewed(created.id);

      expect(result.indicators?.freshnessStatus).toBe(FreshnessStatus.FRESH);
    });

    it('treatment reviewed just past freshness threshold but before cycle → PENDING_REVIEW', async () => {
      const user = await seedUser();
      // Very tight thresholds: FRESH=0-1 months, PENDING_REVIEW=1-2 months
      await seedOrganization({ freshnessThresholdMonths: 1, reviewCycleMonths: 2 });
      const created = await createTreatment(user.id);

      // Manually set lastReviewedAt to 45 days ago (past 1-month threshold, before 2-month cycle)
      const lastReviewedAt = new Date();
      lastReviewedAt.setDate(lastReviewedAt.getDate() - STALE_DAYS);
      await prisma.treatment.update({
        where: { id: created.id },
        data: { lastReviewedAt },
      });

      const found = await service.findOne(created.id);

      expect(found.indicators?.freshnessStatus).toBe(FreshnessStatus.PENDING_REVIEW);
    });

    it('treatment reviewed too long ago → OUTDATED', async () => {
      const user = await seedUser();
      await seedOrganization({ freshnessThresholdMonths: 1, reviewCycleMonths: 2 });
      const created = await createTreatment(user.id);

      // Set lastReviewedAt to 3 months ago (past the 2-month review cycle)
      const lastReviewedAt = new Date();
      lastReviewedAt.setMonth(lastReviewedAt.getMonth() - STALE_MONTHS);
      await prisma.treatment.update({
        where: { id: created.id },
        data: { lastReviewedAt },
      });

      const found = await service.findOne(created.id);

      expect(found.indicators?.freshnessStatus).toBe(FreshnessStatus.OUTDATED);
    });
  });
});
