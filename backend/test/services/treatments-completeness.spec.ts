import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { LegalBasis } from '@article30/shared';
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
const COMPLETENESS_LOW_THRESHOLD = 30;
const COMPLETENESS_HIGH_THRESHOLD = 80;
const COMPLETENESS_SENSITIVE_MIN = 15;

describe('TreatmentsService – Completeness', () => {
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

  describe('completeness computation (via indicators)', () => {
    it('treatment with only name → low completeness (10 points)', async () => {
      const user = await seedUser();
      await seedOrganization();

      // Only name is provided — no other fields
      const treatment = await createTreatment(user.id, { name: 'Minimal Treatment' });

      // name=10 is the only scored field; sensitiveCategories also counts as N/A=5 since hasSensitiveData is not set (false by default)
      expect(treatment.indicators?.completenessScore).toBeLessThan(COMPLETENESS_LOW_THRESHOLD);
    });

    it('treatment with all major fields filled → high completeness score', async () => {
      const user = await seedUser();
      await seedOrganization();

      const treatment = await createTreatment(user.id, {
        name: 'Complete Treatment',
        purpose: 'Main purpose',
        legalBasis: LegalBasis.CONSENT,
        personCategories: ['employees'],
        dataCategories: [{ category: 'identity', description: 'Name and email' }],
        hasSensitiveData: false,
        recipients: [{ type: 'internal', precision: 'HR department' }],
        retentionPeriod: '5 years',
        securityMeasuresDetailed: [{ type: 'encryption', precision: 'AES-256' }],
        hasEvaluationScoring: false,
        hasAutomatedDecisions: false,
        hasSystematicMonitoring: false,
        isLargeScale: false,
        hasCrossDatasetLinking: false,
        involvesVulnerablePersons: false,
        usesInnovativeTech: false,
        canExcludeFromRights: false,
      });

      // name(10)+purpose(15)+legalBasis(10)+personCategories(10)+dataCategories(10)
      // +recipients(10)+retentionPeriod(10)+securityMeasures(10)+sensitiveCategories_NA(5)+riskCriteria(5) = 95
      expect(treatment.indicators?.completenessScore).toBeGreaterThanOrEqual(
        COMPLETENESS_HIGH_THRESHOLD,
      );
    });

    it('treatment with no sensitive data marks sensitiveCategories as complete (N/A)', async () => {
      const user = await seedUser();
      await seedOrganization();

      const treatment = await createTreatment(user.id, {
        name: 'No Sensitive',
        hasSensitiveData: false,
      });

      // hasSensitiveData=false means sensitiveCategories counts as complete (N/A=5 points)
      // name(10) + sensitiveCategories_NA(5) = 15
      expect(treatment.indicators?.completenessScore).toBeGreaterThanOrEqual(
        COMPLETENESS_SENSITIVE_MIN,
      );
    });
  });
});
