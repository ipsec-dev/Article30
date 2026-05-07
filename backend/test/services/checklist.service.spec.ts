import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { ChecklistAnswer } from '@article30/shared';
import { ChecklistService } from '../../src/modules/checklist/checklist.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const EXPECTED_COUNT = 3;
const SETTLE_DELAY_MS = 10;
const ITEM_LAWFULNESS = 'art33-breach';
const ITEM_PURPOSE = 'art34-communication';
const ITEM_MINIMISATION = 'art25-design';

describe('ChecklistService', () => {
  let module: TestingModule;
  let service: ChecklistService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [ChecklistService],
    }).compile();

    service = module.get(ChecklistService);
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

  describe('findAll()', () => {
    it('returns all responses ordered by itemId', async () => {
      const user = await seedUser();

      await service.upsert(ITEM_MINIMISATION, { response: ChecklistAnswer.YES }, user.id);
      await service.upsert(ITEM_LAWFULNESS, { response: ChecklistAnswer.NO }, user.id);
      await service.upsert(ITEM_PURPOSE, { response: ChecklistAnswer.NA }, user.id);

      const results = await service.findAll();

      expect(results.length).toBe(EXPECTED_COUNT);
      // findAll() orders by itemId: art25-design < art33-breach < art34-communication.
      expect(results[0].itemId).toBe(ITEM_MINIMISATION);
      expect(results[1].itemId).toBe(ITEM_LAWFULNESS);
      expect(results[2].itemId).toBe(ITEM_PURPOSE);
    });
  });

  describe('upsert()', () => {
    it('creates new response when item does not exist', async () => {
      const user = await seedUser();

      const result = await service.upsert(
        ITEM_LAWFULNESS,
        { response: ChecklistAnswer.YES, reason: 'Fully compliant' },
        user.id,
      );

      expect(result.itemId).toBe(ITEM_LAWFULNESS);
      expect(result.response).toBe(ChecklistAnswer.YES);
      expect(result.reason).toBe('Fully compliant');
      expect(result.respondedBy).toBe(user.id);

      const all = await service.findAll();
      expect(all.length).toBe(1);
    });

    it('updates existing response when item already exists', async () => {
      const user = await seedUser();

      await service.upsert(
        ITEM_PURPOSE,
        { response: ChecklistAnswer.NO, reason: 'Not done' },
        user.id,
      );
      const updated = await service.upsert(
        ITEM_PURPOSE,
        { response: ChecklistAnswer.YES, reason: 'Now done' },
        user.id,
      );

      expect(updated.itemId).toBe(ITEM_PURPOSE);
      expect(updated.response).toBe(ChecklistAnswer.YES);
      expect(updated.reason).toBe('Now done');

      const all = await service.findAll();
      expect(all.length).toBe(1);
    });

    it('updates respondedAt on update', async () => {
      const user = await seedUser();

      const created = await service.upsert(
        ITEM_MINIMISATION,
        { response: ChecklistAnswer.NO },
        user.id,
      );
      const originalRespondedAt = created.respondedAt;

      // Small pause to ensure time difference
      await new Promise(resolve => setTimeout(resolve, SETTLE_DELAY_MS));

      const updated = await service.upsert(
        ITEM_MINIMISATION,
        { response: ChecklistAnswer.YES },
        user.id,
      );

      expect(updated.respondedAt.getTime()).toBeGreaterThanOrEqual(originalRespondedAt.getTime());
    });
  });

  describe('upsert() itemId validation', () => {
    it('rejects unknown itemId', async () => {
      const user = await seedUser();

      await expect(
        service.upsert('fake-item-id', { response: ChecklistAnswer.YES }, user.id),
      ).rejects.toThrow('Unknown checklist item');
    });

    it('accepts valid itemId', async () => {
      const user = await seedUser();

      const result = await service.upsert(
        ITEM_LAWFULNESS,
        { response: ChecklistAnswer.YES },
        user.id,
      );

      expect(result.itemId).toBe(ITEM_LAWFULNESS);
    });
  });
});
