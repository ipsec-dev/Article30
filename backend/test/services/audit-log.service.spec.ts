import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const ENTITY_TREATMENT = 'treatment';
const ENTITY_VIOLATION = 'violation';
const EXPECTED_COUNT = 3;
const DEFAULT_PAGE_SIZE = 20;
const ACTION_CREATE = 'CREATE';
const ACTION_UPDATE = 'UPDATE';

describe('AuditLogService', () => {
  let module: TestingModule;
  let service: AuditLogService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AuditLogService],
    }).compile();

    service = module.get(AuditLogService);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await module.close();
  });

  async function seedUser(overrides: { email?: string } = {}) {
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

  async function seedAuditLog(
    userId: string,
    overrides: { entity?: string; action?: string; entityId?: string } = {},
  ) {
    return prisma.auditLog.create({
      data: {
        action: overrides.action ?? ACTION_UPDATE,
        entity: overrides.entity ?? ENTITY_TREATMENT,
        entityId: overrides.entityId ?? '00000000-0000-0000-0000-000000000001',
        performedBy: userId,
      },
    });
  }

  describe('findAll()', () => {
    it('returns paginated audit logs ordered by performedAt desc', async () => {
      const user = await seedUser();

      // Create logs with slight delay to guarantee order
      const log1 = await seedAuditLog(user.id, { action: ACTION_CREATE });
      const log2 = await seedAuditLog(user.id, { action: ACTION_UPDATE });
      const log3 = await seedAuditLog(user.id, { action: 'DELETE' });

      // Force distinct timestamps by updating them directly
      await prisma.auditLog.update({
        where: { id: log1.id },
        data: { performedAt: new Date('2026-01-01T00:00:01Z') },
      });
      await prisma.auditLog.update({
        where: { id: log2.id },
        data: { performedAt: new Date('2026-01-01T00:00:02Z') },
      });
      await prisma.auditLog.update({
        where: { id: log3.id },
        data: { performedAt: new Date('2026-01-01T00:00:03Z') },
      });

      const result = await service.findAll(1, 2);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(EXPECTED_COUNT);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      // Ordered by performedAt desc → log3 first
      expect(result.data[0].id).toBe(log3.id);
      expect(result.data[1].id).toBe(log2.id);
    });

    it('filters by entity type when provided', async () => {
      const user = await seedUser();

      await seedAuditLog(user.id, { entity: ENTITY_TREATMENT });
      await seedAuditLog(user.id, { entity: ENTITY_TREATMENT });
      await seedAuditLog(user.id, { entity: ENTITY_VIOLATION });

      const result = await service.findAll(1, DEFAULT_PAGE_SIZE, ENTITY_TREATMENT);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      for (const log of result.data) {
        expect(log.entity).toBe(ENTITY_TREATMENT);
      }
    });

    it('returns all logs when no entity filter is provided', async () => {
      const user = await seedUser();

      await seedAuditLog(user.id, { entity: ENTITY_TREATMENT });
      await seedAuditLog(user.id, { entity: ENTITY_VIOLATION });
      await seedAuditLog(user.id, { entity: 'user' });

      const result = await service.findAll(1, DEFAULT_PAGE_SIZE);

      expect(result.total).toBe(EXPECTED_COUNT);
    });
  });

  describe('create()', () => {
    it('creates audit log entry with all fields', async () => {
      const user = await seedUser();

      const log = await service.create({
        action: ACTION_UPDATE,
        entity: ENTITY_TREATMENT,
        entityId: '00000000-0000-0000-0000-000000000042',
        oldValue: { name: 'Old Name' },
        newValue: { name: 'New Name' },
        performedBy: user.id,
      });

      expect(log.id).toBeDefined();
      expect(log.action).toBe(ACTION_UPDATE);
      expect(log.entity).toBe(ENTITY_TREATMENT);
      expect(log.entityId).toBe('00000000-0000-0000-0000-000000000042');
      expect(log.oldValue).toEqual({ name: 'Old Name' });
      expect(log.newValue).toEqual({ name: 'New Name' });
      expect(log.performedBy).toBe(user.id);
      expect(log.performedAt).toBeDefined();
    });

    it('creates audit log without optional oldValue/newValue', async () => {
      const user = await seedUser();

      const log = await service.create({
        action: ACTION_CREATE,
        entity: ENTITY_VIOLATION,
        entityId: '00000000-0000-0000-0000-000000000099',
        performedBy: user.id,
      });

      expect(log.id).toBeDefined();
      expect(log.action).toBe(ACTION_CREATE);
      expect(log.oldValue).toBeNull();
      expect(log.newValue).toBeNull();
    });

    it('retries transparently on P2034 (serialization failure) and succeeds', async () => {
      const user = await seedUser();
      const p2034 = new Prisma.PrismaClientKnownRequestError(
        'could not serialize access due to concurrent update',
        { code: 'P2034', clientVersion: 'test' },
      );
      const txSpy = vi
        .spyOn(prisma, '$transaction')
        .mockRejectedValueOnce(p2034)
        .mockRejectedValueOnce(p2034);
      try {
        const log = await service.create({
          action: ACTION_CREATE,
          entity: ENTITY_TREATMENT,
          entityId: '00000000-0000-0000-0000-00000000aaaa',
          performedBy: user.id,
        });
        expect(log.id).toBeDefined();
        expect(txSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
      } finally {
        txSpy.mockRestore();
      }
    });

    it('rethrows after MAX_WRITE_ATTEMPTS consecutive P2034 failures', async () => {
      const user = await seedUser();
      const p2034 = new Prisma.PrismaClientKnownRequestError('write conflict', {
        code: 'P2034',
        clientVersion: 'test',
      });
      const txSpy = vi.spyOn(prisma, '$transaction').mockRejectedValue(p2034);
      try {
        await expect(
          service.create({
            action: ACTION_CREATE,
            entity: ENTITY_TREATMENT,
            entityId: '00000000-0000-0000-0000-00000000bbbb',
            performedBy: user.id,
          }),
        ).rejects.toBe(p2034);
        // 4 attempts = MAX_WRITE_ATTEMPTS constant in the service.
        expect(txSpy).toHaveBeenCalledTimes(4);
      } finally {
        txSpy.mockRestore();
      }
    });

    it('does not retry on non-serialization errors (e.g. P2002 unique constraint)', async () => {
      const user = await seedUser();
      const p2002 = new Prisma.PrismaClientKnownRequestError('unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      });
      const txSpy = vi.spyOn(prisma, '$transaction').mockRejectedValue(p2002);
      try {
        await expect(
          service.create({
            action: ACTION_CREATE,
            entity: ENTITY_TREATMENT,
            entityId: '00000000-0000-0000-0000-00000000cccc',
            performedBy: user.id,
          }),
        ).rejects.toBe(p2002);
        expect(txSpy).toHaveBeenCalledTimes(1);
      } finally {
        txSpy.mockRestore();
      }
    });
  });
});
