import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RecitalsService } from '../../src/modules/recitals/recitals.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const RECITAL_A = 10;
const RECITAL_B = 20;
const RECITAL_C = 30;
const RECITAL_SAMPLE = 42;
const RECITAL_UNKNOWN = 9999;
const PAGE_SIZE = 2;
const DEFAULT_PAGE_SIZE = 20;
const TOTAL_SEEDED = 3;

function recitalData(recitalNumber: number) {
  return {
    recitalNumber,
    contentFr: `Recital ${recitalNumber} FR`,
    contentEn: `Recital ${recitalNumber} EN`,
    contentEs: `Recital ${recitalNumber} ES`,
    contentDe: `Recital ${recitalNumber} DE`,
    contentIt: `Recital ${recitalNumber} IT`,
  };
}

describe('RecitalsService', () => {
  let module: TestingModule;
  let service: RecitalsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [RecitalsService],
    }).compile();

    service = module.get(RecitalsService);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
    await prisma.regulationRecital.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  async function seedRecital(recitalNumber: number) {
    return prisma.regulationRecital.create({ data: recitalData(recitalNumber) });
  }

  describe('findAll()', () => {
    it('returns paginated recitals ordered by recitalNumber asc', async () => {
      await seedRecital(RECITAL_A);
      await seedRecital(RECITAL_B);
      await seedRecital(RECITAL_C);

      const result = await service.findAll(1, PAGE_SIZE);

      expect(result.data.length).toBe(PAGE_SIZE);
      expect(result.total).toBe(TOTAL_SEEDED);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(PAGE_SIZE);
      expect(result.data[0].recitalNumber).toBe(RECITAL_A);
      expect(result.data[1].recitalNumber).toBe(RECITAL_B);
    });

    it('second page returns remaining recital', async () => {
      await seedRecital(1);
      await seedRecital(PAGE_SIZE);
      await seedRecital(TOTAL_SEEDED);

      const result = await service.findAll(PAGE_SIZE, PAGE_SIZE);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(TOTAL_SEEDED);
      expect(result.page).toBe(PAGE_SIZE);
      expect(result.data[0].recitalNumber).toBe(TOTAL_SEEDED);
    });

    it('returns empty data when no recitals exist', async () => {
      const result = await service.findAll(1, DEFAULT_PAGE_SIZE);

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findByNumber()', () => {
    it('returns recital by number', async () => {
      await seedRecital(RECITAL_SAMPLE);

      const recital = await service.findByNumber(RECITAL_SAMPLE);

      expect(recital.recitalNumber).toBe(RECITAL_SAMPLE);
      expect(recital.contentFr).toBe(`Recital ${RECITAL_SAMPLE} FR`);
      expect(recital.contentEn).toBe(`Recital ${RECITAL_SAMPLE} EN`);
    });

    it('throws NotFoundException for unknown recital number', async () => {
      await expect(service.findByNumber(RECITAL_UNKNOWN)).rejects.toThrow(NotFoundException);
    });
  });
});
