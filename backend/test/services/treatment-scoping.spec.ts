import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Role } from '@article30/shared';
import { TreatmentsService } from '../../src/modules/treatments/treatments.service';
import { PdfExportService } from '../../src/modules/treatments/pdf-export.service';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { RequestUser } from '../../src/common/types/request-user';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const FRESHNESS_THRESHOLD = 6;
const REVIEW_CYCLE = 12;
const ROLE_ADMIN = 'ADMIN';
const ROLE_PROCESS_OWNER = 'PROCESS_OWNER';
const EMAIL_OWNER = 'owner@test.com';
const EMAIL_ADMIN = 'admin@test.com';
const EMAIL_OTHER = 'other@test.com';
const DEFAULT_PAGE_SIZE = 20;
const NAME_OTHER_TREATMENT = 'Other Treatment';

function makeRequestUser(user: { id: string; email: string; role: Role | string }): RequestUser {
  return {
    id: user.id,
    email: user.email,
    firstName: 'Test',
    lastName: 'User',
    role: user.role as Role,
    approved: true,
  };
}

describe('Treatment Scoping (PROCESS_OWNER)', () => {
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

  // ========== Seed Helpers ==========

  async function seedUser(overrides: { email?: string; name?: string; role?: string } = {}) {
    const hashedPassword = await bcrypt.hash('password', BCRYPT_ROUNDS);
    return prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: overrides.email ?? `user-${Date.now()}@example.com`,
        password: hashedPassword,
        role: (overrides.role as Role) ?? 'ADMIN',
        approved: true,
      },
    });
  }

  async function seedOrganization() {
    return prisma.organization.create({
      data: {
        slug: `test-org-${Date.now()}`,
        companyName: 'Test Company',
        freshnessThresholdMonths: FRESHNESS_THRESHOLD,
        reviewCycleMonths: REVIEW_CYCLE,
      },
    });
  }

  // ========== Tests ==========

  describe('PROCESS_OWNER sees only own treatments', () => {
    it('findAll returns only treatments created by PROCESS_OWNER', async () => {
      const owner = await seedUser({ email: EMAIL_OWNER, role: ROLE_PROCESS_OWNER });
      const other = await seedUser({ email: EMAIL_OTHER, role: ROLE_ADMIN });
      await seedOrganization();

      await service.create({ name: 'Owner Treatment' }, owner.id);
      await service.create({ name: NAME_OTHER_TREATMENT }, other.id);

      const result = await service.findAll(1, DEFAULT_PAGE_SIZE, makeRequestUser(owner));

      expect(result.total).toBe(1);
      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('Owner Treatment');
    });
  });

  describe('PROCESS_OWNER sees treatments assigned to them', () => {
    it('findAll returns treatments assigned to PROCESS_OWNER', async () => {
      const owner = await seedUser({ email: EMAIL_OWNER, role: ROLE_PROCESS_OWNER });
      const admin = await seedUser({ email: EMAIL_ADMIN, role: ROLE_ADMIN });
      await seedOrganization();

      // Admin creates a treatment and assigns it to the process owner
      await service.create({ name: 'Assigned Treatment', assignedTo: owner.id }, admin.id);
      // Admin creates another treatment not assigned to owner
      await service.create({ name: 'Unassigned Treatment' }, admin.id);

      const result = await service.findAll(1, DEFAULT_PAGE_SIZE, makeRequestUser(owner));

      expect(result.total).toBe(1);
      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('Assigned Treatment');
    });
  });

  describe('PROCESS_OWNER cannot access other users treatments', () => {
    it('findOne throws ForbiddenException for unowned treatment', async () => {
      const owner = await seedUser({ email: EMAIL_OWNER, role: ROLE_PROCESS_OWNER });
      const other = await seedUser({ email: EMAIL_OTHER, role: ROLE_ADMIN });
      await seedOrganization();

      const treatment = await service.create({ name: NAME_OTHER_TREATMENT }, other.id);

      await expect(service.findOne(treatment.id, makeRequestUser(owner))).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('ADMIN sees all treatments regardless', () => {
    it('findAll returns all treatments for ADMIN', async () => {
      const admin = await seedUser({ email: EMAIL_ADMIN, role: ROLE_ADMIN });
      const other = await seedUser({ email: EMAIL_OTHER, role: ROLE_PROCESS_OWNER });
      await seedOrganization();

      await service.create({ name: 'Admin Treatment' }, admin.id);
      await service.create({ name: NAME_OTHER_TREATMENT }, other.id);

      const result = await service.findAll(1, DEFAULT_PAGE_SIZE, makeRequestUser(admin));

      expect(result.total).toBe(2);
      expect(result.data.length).toBe(2);
    });
  });

  describe('AUDITOR sees all treatments (read-only)', () => {
    it('findAll returns all treatments for AUDITOR', async () => {
      const auditor = await seedUser({ email: 'auditor@test.com', role: 'AUDITOR' });
      const admin = await seedUser({ email: EMAIL_ADMIN, role: ROLE_ADMIN });
      await seedOrganization();

      await service.create({ name: 'Treatment 1' }, admin.id);
      await service.create({ name: 'Treatment 2' }, admin.id);

      const result = await service.findAll(1, DEFAULT_PAGE_SIZE, makeRequestUser(auditor));

      expect(result.total).toBe(2);
      expect(result.data.length).toBe(2);
    });

    it('findOne returns any treatment for AUDITOR', async () => {
      const auditor = await seedUser({ email: 'auditor@test.com', role: 'AUDITOR' });
      const admin = await seedUser({ email: EMAIL_ADMIN, role: ROLE_ADMIN });
      await seedOrganization();

      const treatment = await service.create({ name: 'Any Treatment' }, admin.id);

      const found = await service.findOne(treatment.id, makeRequestUser(auditor));
      expect(found.id).toBe(treatment.id);
    });
  });
});
