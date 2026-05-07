import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { DsrType } from '@article30/shared';
import { DsrService } from '../../src/modules/dsr/dsr.service';
import { DsrModule } from '../../src/modules/dsr/dsr.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const DEADLINE_DAYS = 30;

describe('DsrService (crud)', () => {
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

  describe('create()', () => {
    it('sets deadline to receivedAt + 30 days', async () => {
      const user = await seedUser();
      const before = new Date();
      const dsr = await createDsr(user.id);
      const after = new Date();

      const expectedMin = new Date(before);
      expectedMin.setDate(expectedMin.getDate() + DEADLINE_DAYS);
      const expectedMax = new Date(after);
      expectedMax.setDate(expectedMax.getDate() + DEADLINE_DAYS);

      expect(dsr.deadline.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(dsr.deadline.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });

    it('sets createdBy to the given userId', async () => {
      const user = await seedUser();
      const dsr = await createDsr(user.id);

      expect(dsr.createdBy).toBe(user.id);
    });
  });

  describe('submit()', () => {
    it('creates DSR with null createdBy', async () => {
      const result = await service.submit({
        type: DsrType.ERASURE,
        requesterName: 'Public User',
        requesterEmail: 'public@example.com',
      });

      expect(result.id).toBeDefined();
      expect(result.deadline).toBeDefined();

      const dbDsr = await prisma.dataSubjectRequest.findUnique({ where: { id: result.id } });
      expect(dbDsr?.createdBy).toBeNull();
    });
  });
});
