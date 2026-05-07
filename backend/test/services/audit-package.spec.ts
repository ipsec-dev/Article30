import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditPackageService } from '../../src/modules/compliance/audit-package.service';
import { ReportService } from '../../src/modules/compliance/report.service';
import { ComplianceService } from '../../src/modules/compliance/compliance.service';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const ZIP_MAGIC_PK = 0x50;
const ZIP_MAGIC_KB = 0x4b;
const KNOWN_HASH = 'e'.repeat(64);

describe('AuditPackageService', () => {
  let module: TestingModule;
  let service: AuditPackageService;
  let prisma: PrismaService;
  let auditLogService: AuditLogService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        AuditPackageService,
        ComplianceService,
        {
          provide: ReportService,
          useValue: {
            generateReport: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock')),
          },
        },
        {
          provide: AuditLogService,
          useValue: { create: vi.fn().mockResolvedValue({ hash: KNOWN_HASH }) },
        },
      ],
    }).compile();

    service = module.get(AuditPackageService);
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

  it('calls auditLog.create once with action EXPORT, entity compliance-package, and performedBy', async () => {
    await service.generatePackage('u-exporter');
    expect(auditLogService.create).toHaveBeenCalledOnce();
    expect(auditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EXPORT',
        entity: 'compliance-package',
        performedBy: 'u-exporter',
      }),
    );
  });

  it('generates a ZIP buffer', async () => {
    const buffer = await service.generatePackage('u-1');

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // ZIP files start with PK (0x50 0x4B)
    expect(buffer[0]).toBe(ZIP_MAGIC_PK);
    expect(buffer[1]).toBe(ZIP_MAGIC_KB);
  });
});
