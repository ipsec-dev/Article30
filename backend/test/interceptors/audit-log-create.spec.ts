import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { createHmac } from 'node:crypto';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR — test-only default
const GENESIS = 'GENESIS';
const TEST_ENTITY_ID = '00000000-0000-0000-0000-000000000001';

describe('AuditLogService — create() hash chain', () => {
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

  it('first entry uses GENESIS as previousHash source and stores null previousHash', async () => {
    const user = await seedUser();

    const entry = await service.create({
      action: 'CREATE',
      entity: 'treatment',
      entityId: TEST_ENTITY_ID,
      newValue: { name: 'Test' },
      performedBy: user.id,
    });

    expect(entry.previousHash).toBeNull();
    expect(entry.hash).toBeDefined();
    expect(entry.hash).toHaveLength(64);
    expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);

    // Verify the hash is correctly computed
    const expectedInput = [
      GENESIS,
      entry.action,
      entry.entity,
      entry.entityId,
      JSON.stringify(null),
      JSON.stringify(entry.newValue),
      entry.performedBy,
      entry.performedAt.toISOString(),
    ].join('|');
    const expectedHash = createHmac('sha256', process.env.AUDIT_HMAC_SECRET!)
      .update(expectedInput)
      .digest('hex');
    expect(entry.hash).toBe(expectedHash);
  });

  it('second entry references the first entry hash as previousHash', async () => {
    const user = await seedUser();

    const first = await service.create({
      action: 'CREATE',
      entity: 'treatment',
      entityId: TEST_ENTITY_ID,
      newValue: { name: 'First' },
      performedBy: user.id,
    });

    const second = await service.create({
      action: 'UPDATE',
      entity: 'treatment',
      entityId: TEST_ENTITY_ID,
      oldValue: { name: 'First' },
      newValue: { name: 'Second' },
      performedBy: user.id,
    });

    expect(second.previousHash).toBe(first.hash);
    expect(second.hash).toHaveLength(64);
    expect(second.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(second.hash).not.toBe(first.hash);

    // Verify second hash is computed with first hash as input
    const expectedInput = [
      first.hash,
      second.action,
      second.entity,
      second.entityId,
      JSON.stringify(second.oldValue),
      JSON.stringify(second.newValue),
      second.performedBy,
      second.performedAt.toISOString(),
    ].join('|');
    const expectedHash = createHmac('sha256', process.env.AUDIT_HMAC_SECRET!)
      .update(expectedInput)
      .digest('hex');
    expect(second.hash).toBe(expectedHash);
  });

  it('stores oldValue and newValue correctly', async () => {
    const user = await seedUser();

    const entry = await service.create({
      action: 'UPDATE',
      entity: 'treatment',
      entityId: TEST_ENTITY_ID,
      oldValue: { name: 'Old Name' },
      newValue: { name: 'New Name' },
      performedBy: user.id,
    });

    expect(entry.oldValue).toEqual({ name: 'Old Name' });
    expect(entry.newValue).toEqual({ name: 'New Name' });
  });
});
