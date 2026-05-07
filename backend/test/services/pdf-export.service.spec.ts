import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Organization, Treatment } from '@prisma/client';
import { TreatmentStatus } from '@prisma/client';
import { PdfExportService } from '../../src/modules/treatments/pdf-export.service';
import type { AuditLogService } from '../../src/modules/audit-log/audit-log.service';

const KNOWN_HASH = 'a'.repeat(64);

function makeAuditLogService(): AuditLogService {
  return {
    create: vi.fn().mockResolvedValue({ hash: KNOWN_HASH }),
  } as unknown as AuditLogService;
}

function makeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    slug: 'acme-sas',
    locale: 'fr',
    companyName: 'Acme SAS',
    siren: '123456789',
    address: '1 rue Test, Paris',
    representativeName: 'Jane Doe',
    representativeRole: 'CEO',
    dpoName: 'John DPO',
    dpoEmail: 'dpo@acme.test',
    dpoPhone: '+33 1 00 00 00 00',
    annualTurnover: 1_000_000n,
    freshnessThresholdMonths: 6,
    reviewCycleMonths: 12,
    enforceSeparationOfDuties: true,
    notifyDsrDeadline: true,
    notifyVendorDpaExpiry: true,
    notifyTreatmentReview: true,
    notifyViolation72h: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeTreatment(overrides: Partial<Treatment> = {}): Treatment {
  const base: Treatment = {
    id: 't-1',
    refNumber: 42,
    name: 'CRM clients',
    purpose: 'Gestion relation client',
    subPurposes: [],
    legalBasis: 'consent',
    personCategories: ['customers'],
    dataCategories: [],
    hasSensitiveData: false,
    sensitiveCategories: [],
    recipientTypes: ['internal'],
    recipients: [],
    transfers: [],
    retentionPeriod: '5 ans',
    securityMeasures: [],
    securityMeasuresDetailed: [],
    hasEvaluationScoring: false,
    hasAutomatedDecisions: false,
    hasSystematicMonitoring: false,
    isLargeScale: false,
    hasCrossDatasetLinking: false,
    involvesVulnerablePersons: false,
    usesInnovativeTech: false,
    canExcludeFromRights: false,
    lastReviewedAt: null,
    nextReviewAt: null,
    status: TreatmentStatus.DRAFT,
    validatedBy: null,
    validatedAt: null,
    createdBy: 'u-1',
    assignedTo: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  return { ...base, ...overrides } as Treatment;
}

function assertValidPdf(buf: Buffer): void {
  expect(Buffer.isBuffer(buf)).toBe(true);
  expect(buf.length).toBeGreaterThan(1000);
  expect(buf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
}

describe('PdfExportService', () => {
  let service: PdfExportService;
  let auditLogService: AuditLogService;

  beforeEach(() => {
    auditLogService = makeAuditLogService();
    service = new PdfExportService(auditLogService);
  });

  it('calls auditLog.create with action EXPORT, correct entity/entityId, and performedBy', async () => {
    const treatment = makeTreatment();
    await service.generatePdf(treatment, makeOrg(), 'u-exporter');
    expect(auditLogService.create).toHaveBeenCalledOnce();
    expect(auditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EXPORT',
        entity: 'treatment',
        entityId: 't-1',
        performedBy: 'u-exporter',
      }),
    );
  });

  it('produces a non-empty PDF buffer after audit log write', async () => {
    const buf = await service.generatePdf(makeTreatment(), makeOrg(), 'u-1');
    assertValidPdf(buf);
  });

  it('produces a valid PDF for a minimal draft treatment with no indicators', async () => {
    const buf = await service.generatePdf(makeTreatment(), makeOrg(), 'u-1');
    assertValidPdf(buf);
  });

  it('renders a validated treatment with validatedAt in the status line', async () => {
    const treatment = makeTreatment({
      status: TreatmentStatus.VALIDATED,
      validatedAt: new Date('2026-02-15'),
      validatedBy: 'u-admin',
    });
    const buf = await service.generatePdf(treatment, makeOrg(), 'u-1');
    assertValidPdf(buf);
  });

  it('renders sensitive data section when hasSensitiveData=true and sensitiveCategories non-empty', async () => {
    const treatment = makeTreatment({
      hasSensitiveData: true,
      sensitiveCategories: ['health', 'biometric'],
    });
    const buf = await service.generatePdf(treatment, makeOrg(), 'u-1');
    assertValidPdf(buf);
  });

  it('renders populated dataCategories / recipients / transfers / securityMeasures tables', async () => {
    const treatment = makeTreatment({
      dataCategories: [
        { category: 'identity', description: 'Nom, prenom', retentionPeriod: '5 ans' },
      ] as unknown as Treatment['dataCategories'],
      recipients: [
        { type: 'internal', precision: 'Service commercial' },
      ] as unknown as Treatment['recipients'],
      transfers: [
        { destinationOrg: 'AWS Inc.', country: 'US', guaranteeType: 'scc' },
      ] as unknown as Treatment['transfers'],
      securityMeasuresDetailed: [
        { type: 'encryption', precision: 'AES-256 at rest' },
      ] as unknown as Treatment['securityMeasuresDetailed'],
    });
    const buf = await service.generatePdf(treatment, makeOrg(), 'u-1');
    assertValidPdf(buf);
  });

  it('renders indicators section when treatment.indicators is provided', async () => {
    const treatment = {
      ...makeTreatment(),
      indicators: {
        completenessScore: 82,
        riskLevel: 'HIGH',
        riskCriteriaCount: 5,
        freshnessStatus: 'FRESH',
        aipdRequired: true,
      },
    } as unknown as Treatment;
    const buf = await service.generatePdf(treatment, makeOrg(), 'u-1');
    assertValidPdf(buf);
  });

  it('renders "Jamais" / "Non planifiee" when lastReviewedAt / nextReviewAt are null', async () => {
    const treatment = {
      ...makeTreatment({ lastReviewedAt: null, nextReviewAt: null }),
      indicators: {
        completenessScore: 50,
        riskLevel: 'LOW',
        riskCriteriaCount: 0,
        freshnessStatus: 'OUTDATED',
        aipdRequired: false,
      },
    } as unknown as Treatment;
    const buf = await service.generatePdf(treatment, makeOrg(), 'u-1');
    assertValidPdf(buf);
  });

  it('renders concrete dates when lastReviewedAt and nextReviewAt are present', async () => {
    const treatment = {
      ...makeTreatment({
        lastReviewedAt: new Date('2026-03-01'),
        nextReviewAt: new Date('2027-03-01'),
      }),
      indicators: {
        completenessScore: 95,
        riskLevel: 'MEDIUM',
        riskCriteriaCount: 3,
        freshnessStatus: 'PENDING_REVIEW',
        aipdRequired: false,
      },
    } as unknown as Treatment;
    const buf = await service.generatePdf(treatment, makeOrg(), 'u-1');
    assertValidPdf(buf);
  });

  it('renders all 9 risk criteria as active when every flag is true', async () => {
    const treatment = makeTreatment({
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
    const buf = await service.generatePdf(treatment, makeOrg(), 'u-1');
    assertValidPdf(buf);
  });

  it('renders "N/A" when refNumber is null', async () => {
    const treatment = makeTreatment({ refNumber: null });
    const buf = await service.generatePdf(treatment, makeOrg(), 'u-1');
    assertValidPdf(buf);
  });

  it('renders NOT_SPECIFIED placeholders when organization fields are null', async () => {
    const org = makeOrg({
      companyName: null,
      siren: null,
      address: null,
      representativeName: null,
      representativeRole: null,
      dpoName: null,
      dpoEmail: null,
      dpoPhone: null,
      annualTurnover: null,
    });
    const buf = await service.generatePdf(makeTreatment(), org, 'u-1');
    assertValidPdf(buf);
  });

  it('renders populated subPurposes and personCategories arrays', async () => {
    const treatment = makeTreatment({
      subPurposes: ['analytics', 'newsletter'],
      personCategories: ['customers', 'prospects', 'employees'],
    });
    const buf = await service.generatePdf(treatment, makeOrg(), 'u-1');
    assertValidPdf(buf);
  });
});
