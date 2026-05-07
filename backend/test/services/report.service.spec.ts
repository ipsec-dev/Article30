import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from '../../src/modules/compliance/report.service';
import { ComplianceService } from '../../src/modules/compliance/compliance.service';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const PDF_HEADER_LENGTH = 4;
const KNOWN_HASH = 'd'.repeat(64);

describe('ReportService', () => {
  let module: TestingModule;
  let service: ReportService;
  let prisma: PrismaService;
  let auditLogService: AuditLogService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        ComplianceService,
        ReportService,
        {
          provide: AuditLogService,
          useValue: { create: vi.fn().mockResolvedValue({ hash: KNOWN_HASH }) },
        },
      ],
    }).compile();

    service = module.get(ReportService);
    prisma = module.get(PrismaService);
    auditLogService = module.get(AuditLogService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  it('calls auditLog.create with action EXPORT, entity compliance-report, and performedBy', async () => {
    await service.generateReport('u-exporter');
    expect(auditLogService.create).toHaveBeenCalledOnce();
    expect(auditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EXPORT',
        entity: 'compliance-report',
        performedBy: 'u-exporter',
      }),
    );
  });

  it('generates a PDF buffer', async () => {
    const buffer = await service.generateReport('u-1');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(buffer.toString('ascii', 0, PDF_HEADER_LENGTH)).toBe('%PDF');
  });

  it('includes org info when available', async () => {
    await prisma.organization.create({
      data: {
        slug: `test-org-${Date.now()}`,
        companyName: 'Acme Corp',
        siren: '123456789',
        address: '1 Rue de Test, Paris',
        dpoName: 'Jane Doe',
        representativeName: 'John Smith',
      },
    });

    const buffer = await service.generateReport('u-1');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString('ascii', 0, PDF_HEADER_LENGTH)).toBe('%PDF');
  });
});
