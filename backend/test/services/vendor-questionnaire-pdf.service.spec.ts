import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@article30/shared';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { VendorQuestionnairePdfService } from '../../src/modules/vendors/vendor-questionnaire-pdf.service';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR — test-only default

const KNOWN_HASH = 'c'.repeat(64);

function assertValidPdf(buf: Buffer): void {
  expect(Buffer.isBuffer(buf)).toBe(true);
  expect(buf.length).toBeGreaterThan(1000);
  expect(buf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
}

describe('VendorQuestionnairePdfService', () => {
  let module: TestingModule;
  let service: VendorQuestionnairePdfService;
  let prisma: PrismaService;
  let auditLogService: AuditLogService;
  let userId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        VendorQuestionnairePdfService,
        {
          provide: AuditLogService,
          useValue: { create: vi.fn().mockResolvedValue({ hash: KNOWN_HASH }) },
        },
      ],
    }).compile();
    service = module.get(VendorQuestionnairePdfService);
    prisma = module.get(PrismaService);
    auditLogService = module.get(AuditLogService);
  });

  afterAll(async () => {
    await module.close();
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
    vi.clearAllMocks();
  });

  async function seedCreator() {
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'Creator',
        email: `creator-${randomUUID()}@example.test`,
        password: await bcrypt.hash('Strongpass12', 4),
        role: Role.DPO,
        approved: true,
      },
    });
    userId = user.id;
    return user;
  }

  async function seedVendor(name = 'Acme Cloud') {
    await seedCreator();
    return prisma.vendor.create({
      data: {
        name,
        createdBy: userId,
      },
    });
  }

  it('throws NotFoundException when the vendor does not exist', async () => {
    await expect(service.generate(randomUUID(), 'u-1')).rejects.toThrow(NotFoundException);
  });

  it('calls auditLog.create with action EXPORT, entity vendor, and performedBy', async () => {
    const vendor = await seedVendor();
    await service.generate(vendor.id, 'u-exporter');
    expect(auditLogService.create).toHaveBeenCalledOnce();
    expect(auditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EXPORT',
        entity: 'vendor',
        entityId: vendor.id,
        performedBy: 'u-exporter',
      }),
    );
  });

  it('generates a valid PDF when no organization exists (fallback footer/instructions)', async () => {
    const vendor = await seedVendor();
    const buf = await service.generate(vendor.id, 'u-1');
    assertValidPdf(buf);
  });

  it('generates a valid PDF using organization companyName and dpoEmail in footer', async () => {
    const vendor = await seedVendor('Globex Corp');
    await prisma.organization.create({
      data: {
        slug: `test-org-${Date.now()}`,
        companyName: 'Initech SAS',
        dpoEmail: 'dpo@initech.example',
      },
    });
    const buf = await service.generate(vendor.id, 'u-1');
    assertValidPdf(buf);
  });

  it('generates a valid PDF when organization has companyName but no dpoEmail', async () => {
    const vendor = await seedVendor('Soylent Ltd');
    await prisma.organization.create({
      data: { slug: `test-org-${Date.now()}`, companyName: 'Hooli SA' },
    });
    const buf = await service.generate(vendor.id, 'u-1');
    assertValidPdf(buf);
  });
});
