import { beforeAll, afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ArticlesService } from '../../src/modules/articles/articles.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test';

async function seedArticle(prisma: PrismaService, number: number) {
  return prisma.regulationArticle.create({
    data: {
      articleNumber: number,
      chapter: `Chapter ${number}`,
      titleFr: `Titre FR ${number}`,
      titleEn: `Title EN ${number}`,
      contentFr: `Contenu FR ${number}`,
      contentEn: `Content EN ${number}`,
      contentEs: `Contenido ES ${number}`,
      contentDe: `Inhalt DE ${number}`,
      contentIt: `Contenuto IT ${number}`,
    },
  });
}

describe('ArticlesService', () => {
  let module: TestingModule;
  let service: ArticlesService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [ArticlesService],
    }).compile();
    service = module.get(ArticlesService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await prisma.regulationArticle.deleteMany();
  });

  afterEach(async () => {
    await prisma.regulationArticle.deleteMany();
    await cleanupDatabase(prisma);
  });

  describe('findAll', () => {
    it('returns empty data and total=0 when table is empty', async () => {
      const result = await service.findAll();
      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });

    it('orders by articleNumber ascending', async () => {
      await seedArticle(prisma, 3);
      await seedArticle(prisma, 1);
      await seedArticle(prisma, 2);
      const result = await service.findAll();
      expect(result.data.map(a => a.articleNumber)).toEqual([1, 2, 3]);
      expect(result.total).toBe(3);
    });

    it('applies page + limit pagination (skip/take math)', async () => {
      for (let n = 1; n <= 5; n++) await seedArticle(prisma, n);
      const page2 = await service.findAll(2, 2);
      expect(page2.data.map(a => a.articleNumber)).toEqual([3, 4]);
      expect(page2.total).toBe(5);
      expect(page2.page).toBe(2);
      expect(page2.limit).toBe(2);
    });

    it('uses the default limit of 20 when limit is omitted', async () => {
      await seedArticle(prisma, 1);
      const result = await service.findAll(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('findByNumber', () => {
    it('returns the article matching articleNumber', async () => {
      await seedArticle(prisma, 7);
      const result = await service.findByNumber(7);
      expect(result.articleNumber).toBe(7);
      expect(result.titleEn).toBe('Title EN 7');
    });

    it('throws NotFoundException when the article does not exist', async () => {
      await expect(service.findByNumber(999)).rejects.toThrow(NotFoundException);
    });
  });
});
