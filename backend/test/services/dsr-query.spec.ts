import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { DsrType, DsrStatus as SharedDsrStatus } from '@article30/shared';
import { DsrStatus } from '@prisma/client';
import { DsrService } from '../../src/modules/dsr/dsr.service';
import { DsrModule } from '../../src/modules/dsr/dsr.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const EXPECTED_COUNT = 3;
const DEFAULT_PAGE_SIZE = 20;
const EMAIL_A = 'a@example.com';
const EMAIL_B = 'b@example.com';
const EMAIL_C = 'c@example.com';

describe('DsrService (query)', () => {
  let module: TestingModule;
  let service: DsrService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule, DsrModule],
    }).compile();

    service = module.get(DsrService);
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

  async function createDsr(
    userId: string,
    overrides: Partial<{
      type: DsrType;
      requesterName: string;
      requesterEmail: string;
      description: string;
    }> = {},
  ) {
    return service.create(
      {
        type: overrides.type ?? DsrType.ACCESS,
        requesterName: overrides.requesterName ?? 'John Doe',
        requesterEmail: overrides.requesterEmail ?? 'john@example.com',
        description: overrides.description,
      },
      userId,
    );
  }

  describe('findAll()', () => {
    it('returns paginated results (create 3, fetch page=1 limit=2 → data.length=2, total=3)', async () => {
      const user = await seedUser();
      await createDsr(user.id, { requesterEmail: EMAIL_A });
      await createDsr(user.id, { requesterEmail: EMAIL_B });
      await createDsr(user.id, { requesterEmail: EMAIL_C });

      const result = await service.findAll(1, 2);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(EXPECTED_COUNT);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('filters by status', async () => {
      const user = await seedUser();
      const dsr1 = await createDsr(user.id, { requesterEmail: EMAIL_A });
      await createDsr(user.id, { requesterEmail: EMAIL_B });

      // Move dsr1 to IDENTITY_VERIFIED via direct DB update
      await prisma.dataSubjectRequest.update({
        where: { id: dsr1.id },
        data: { status: DsrStatus.IDENTITY_VERIFIED, identityVerified: true },
      });

      const result = await service.findAll(1, DEFAULT_PAGE_SIZE, {
        status: SharedDsrStatus.IDENTITY_VERIFIED,
      });

      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe(dsr1.id);
    });

    it('filters by type', async () => {
      const user = await seedUser();
      await createDsr(user.id, { type: DsrType.ACCESS, requesterEmail: EMAIL_A });
      await createDsr(user.id, { type: DsrType.ERASURE, requesterEmail: EMAIL_B });
      await createDsr(user.id, { type: DsrType.ERASURE, requesterEmail: EMAIL_C });

      const result = await service.findAll(1, DEFAULT_PAGE_SIZE, {
        type: DsrType.ERASURE,
      });

      expect(result.total).toBe(2);
      for (const dsr of result.data) {
        expect(dsr.type).toBe(DsrType.ERASURE);
      }
    });
  });

  describe('findOne()', () => {
    it('returns DSR with relations (creator, assignee)', async () => {
      const user = await seedUser();
      const dsr = await createDsr(user.id);

      const found = await service.findOne(dsr.id);

      expect(found.id).toBe(dsr.id);
      expect(found.creator).toBeDefined();
      expect(found.creator?.id).toBe(user.id);
    });

    it('throws NotFoundException for unknown id', async () => {
      await expect(service.findOne('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats()', () => {
    it('returns correct counts after creating 2 DSRs of different types', async () => {
      const user = await seedUser();
      await createDsr(user.id, { type: DsrType.ACCESS, requesterEmail: EMAIL_A });
      await createDsr(user.id, { type: DsrType.ERASURE, requesterEmail: EMAIL_B });

      const stats = await service.getStats();

      expect(stats.total).toBe(2);
      expect(stats.byType[DsrType.ACCESS]).toBe(1);
      expect(stats.byType[DsrType.ERASURE]).toBe(1);
      expect(stats.byStatus[DsrStatus.RECEIVED]).toBe(2);
    });
  });
});
