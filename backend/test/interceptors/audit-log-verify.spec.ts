import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR — test-only default
const TEST_ENTITY_ID = '00000000-0000-0000-0000-000000000001';
const EXPECTED_CHAIN_LENGTH = 3;
const JSONB_REORDER_FIXTURE = {
  zebra: 'last',
  alpha: 'first',
  middle: { zz: 2, aa: 1 },
  beta: [3, 2, 1], // NOSONAR — test fixture data
};

describe('AuditLogService — verify() chain integrity', () => {
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
    const hashedPassword = await bcrypt.hash('password', 10);
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

  async function seedChain(userId: string) {
    await service.create({
      action: 'CREATE',
      entity: 'treatment',
      entityId: TEST_ENTITY_ID,
      newValue: { name: 'First' },
      performedBy: userId,
    });

    const second = await service.create({
      action: 'UPDATE',
      entity: 'treatment',
      entityId: TEST_ENTITY_ID,
      oldValue: { name: 'First' },
      newValue: { name: 'Second' },
      performedBy: userId,
    });

    await service.create({
      action: 'DELETE',
      entity: 'treatment',
      entityId: TEST_ENTITY_ID,
      oldValue: { name: 'Second' },
      performedBy: userId,
    });

    return { second };
  }

  it('returns valid for an intact chain', async () => {
    const user = await seedUser();
    await seedChain(user.id);

    const result = await service.verify();

    expect(result.valid).toBe(true);
    expect(result.totalRows).toBe(EXPECTED_CHAIN_LENGTH);
    expect(result.checkedAt).toBeDefined();
    expect(result).not.toHaveProperty('brokenAt');
  });

  it('returns valid for empty chain', async () => {
    const result = await service.verify();

    expect(result.valid).toBe(true);
    expect(result.totalRows).toBe(0);
  });

  it('detects tampering when a row newValue is modified', async () => {
    const user = await seedUser();
    const { second } = await seedChain(user.id);

    // Tamper with the second entry
    await prisma.auditLog.update({
      where: { id: second.id },
      data: { newValue: { name: 'TAMPERED' } },
    });

    const result = await service.verify();

    expect(result.valid).toBe(false);
    expect(result.totalRows).toBe(EXPECTED_CHAIN_LENGTH);
    expect(result.brokenAt).toBeDefined();
    expect(result.brokenAt?.id).toBe(second.id);
  });

  it('detects tampering at the first entry', async () => {
    const user = await seedUser();

    const first = await service.create({
      action: 'CREATE',
      entity: 'treatment',
      entityId: TEST_ENTITY_ID,
      newValue: { name: 'First' },
      performedBy: user.id,
    });

    await service.create({
      action: 'UPDATE',
      entity: 'treatment',
      entityId: TEST_ENTITY_ID,
      oldValue: { name: 'First' },
      newValue: { name: 'Second' },
      performedBy: user.id,
    });

    // Tamper with the first entry
    await prisma.auditLog.update({
      where: { id: first.id },
      data: { newValue: { name: 'TAMPERED' } },
    });

    const result = await service.verify();

    expect(result.valid).toBe(false);
    expect(result.brokenAt?.id).toBe(first.id);
  });

  it('chain survives JSONB key reordering', async () => {
    const user = await seedUser();

    // Create an entry with a multi-key object whose keys could be reordered by JSONB
    await service.create({
      action: 'CREATE',
      entity: 'treatment',
      entityId: TEST_ENTITY_ID,
      newValue: JSONB_REORDER_FIXTURE,
      performedBy: user.id,
    });

    // Simulate JSONB reordering: update the row with the same data in different key order.
    // Postgres JSONB may return keys in a different order than insertion order.
    const row = await prisma.auditLog.findFirstOrThrow({
      orderBy: { performedAt: 'desc' },
    });
    await prisma.auditLog.update({
      where: { id: row.id },
      data: {
        newValue: {
          middle: { aa: 1, zz: 2 },
          alpha: 'first',
          beta: JSONB_REORDER_FIXTURE.beta,
          zebra: 'last',
        },
      },
    });

    const result = await service.verify();

    expect(result.valid).toBe(true);
    expect(result.totalRows).toBe(1);
  });
});
