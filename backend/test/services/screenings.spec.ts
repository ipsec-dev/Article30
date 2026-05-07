import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Role, ChecklistAnswer, VALID_SCREENING_IDS } from '@article30/shared';
import { ScreeningsService } from '../../src/modules/screenings/screenings.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const PERFECT_SCORE = 100;

function allYesResponses(): Record<string, string> {
  const responses: Record<string, string> = {};
  for (const id of VALID_SCREENING_IDS) {
    responses[id] = ChecklistAnswer.YES;
  }
  return responses;
}

describe('ScreeningsService', () => {
  let module: TestingModule;
  let service: ScreeningsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [ScreeningsService],
    }).compile();
    service = module.get(ScreeningsService);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });
  afterAll(async () => {
    await module.close();
  });

  async function seedUser() {
    return prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `user-${Date.now()}@example.com`,
        password: await bcrypt.hash('password', BCRYPT_ROUNDS),
        role: Role.ADMIN,
        approved: true,
      },
    });
  }

  describe('create', () => {
    it('creates screening with GREEN verdict when all YES', async () => {
      const user = await seedUser();
      const screening = await service.create(
        { title: 'Test', responses: allYesResponses() },
        user.id,
      );
      expect(screening.score).toBe(PERFECT_SCORE);
      expect(screening.verdict).toBe('GREEN');
    });

    it('creates screening with RED verdict when 4+ NO', async () => {
      const user = await seedUser();
      const responses = allYesResponses();
      responses.q1 = ChecklistAnswer.NO;
      responses.q2 = ChecklistAnswer.NO;
      responses.q3 = ChecklistAnswer.NO;
      responses.q4 = ChecklistAnswer.NO;
      const screening = await service.create({ title: 'Bad', responses }, user.id);
      expect(screening.verdict).toBe('RED');
    });

    it('creates screening with ORANGE verdict when 1-3 NO', async () => {
      const user = await seedUser();
      const responses = allYesResponses();
      responses.q7 = ChecklistAnswer.NO;
      const screening = await service.create({ title: 'Partial', responses }, user.id);
      expect(screening.verdict).toBe('ORANGE');
    });

    it('rejects incomplete responses', async () => {
      const user = await seedUser();
      await expect(
        service.create({ title: 'Incomplete', responses: { q1: 'YES' } }, user.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid answer values', async () => {
      const user = await seedUser();
      const responses = allYesResponses();
      responses.q1 = 'INVALID';
      await expect(service.create({ title: 'Invalid', responses }, user.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('convert', () => {
    it('creates a draft treatment from screening', async () => {
      const user = await seedUser();
      const screening = await service.create(
        { title: 'Newsletter', responses: allYesResponses() },
        user.id,
      );
      const result = await service.convert(screening.id);
      expect(result.treatmentId).toBeDefined();
      const treatment = await prisma.treatment.findUnique({ where: { id: result.treatmentId } });
      expect(treatment).not.toBeNull();
      expect(treatment?.name).toBe('Newsletter');
    });

    it('sets hasSensitiveData when q20 is YES', async () => {
      const user = await seedUser();
      const responses = allYesResponses();
      responses.q20 = ChecklistAnswer.YES;
      const screening = await service.create({ title: 'Sensitive', responses }, user.id);
      const result = await service.convert(screening.id);
      const treatment = await prisma.treatment.findUnique({ where: { id: result.treatmentId } });
      expect(treatment?.hasSensitiveData).toBe(true);
    });

    it('rejects double conversion', async () => {
      const user = await seedUser();
      const screening = await service.create(
        { title: 'Double', responses: allYesResponses() },
        user.id,
      );
      await service.convert(screening.id);
      await expect(service.convert(screening.id)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for unknown id', async () => {
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
