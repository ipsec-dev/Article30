import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedUser } from './seed';

describe('articles.controller (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await cleanupDatabase(testApp.prisma);
    await testApp.prisma.regulationArticle.deleteMany();
    await testApp.close();
  });

  afterEach(async () => {
    // cleanupDatabase() does not include regulation_articles (it's reference
    // data not owned by users), so we clear it separately here to avoid
    // articleNumber unique-constraint collisions across tests.
    await testApp.prisma.regulationArticle.deleteMany();
    await cleanupDatabase(testApp.prisma);
    const sessionKeys = await testApp.redis.keys('sess:*');
    if (sessionKeys.length > 0) await testApp.redis.del(...sessionKeys);
    // Reset the in-memory ThrottlerStorageService map so rate limits don't
    // leak across tests sharing one source IP.
    const throttlerStorage = testApp.app.get<{ storage?: Map<string, unknown> }>(ThrottlerStorage, {
      strict: false,
    });
    throttlerStorage?.storage?.clear();
    testApp.mailSink.length = 0;
  });

  describe('GET /api/articles', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/articles');
      expect(res.status).toBe(401);
    });

    it('returns { data, total, page, limit } with seeded articles for an approved user', async () => {
      await testApp.prisma.regulationArticle.createMany({
        data: [
          {
            articleNumber: 1,
            chapter: 'I',
            titleFr: 'Objet',
            titleEn: 'Subject-matter',
            contentFr: 'Contenu FR 1',
            contentEn: 'Content EN 1',
            contentEs: 'Contenido ES 1',
            contentDe: 'Inhalt DE 1',
            contentIt: 'Contenuto IT 1',
          },
          {
            articleNumber: 2,
            chapter: 'I',
            titleFr: 'Champ d’application matériel',
            titleEn: 'Material scope',
            contentFr: 'Contenu FR 2',
            contentEn: 'Content EN 2',
            contentEs: 'Contenido ES 2',
            contentDe: 'Inhalt DE 2',
            contentIt: 'Contenuto IT 2',
          },
        ],
      });
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/articles');
      expect(res.status).toBe(200);
      expect(res.body).toBeTypeOf('object');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      // Service orders by articleNumber asc.
      expect(res.body.data[0].articleNumber).toBe(1);
      expect(res.body.data[1].articleNumber).toBe(2);
      expect(res.body.data[0].titleEn).toBe('Subject-matter');
    });
  });

  describe('GET /api/articles/:number', () => {
    it('returns the matching article when it exists', async () => {
      const seeded = await testApp.prisma.regulationArticle.create({
        data: {
          articleNumber: 5,
          chapter: 'II',
          titleFr: 'Principes',
          titleEn: 'Principles',
          contentFr: 'Contenu FR 5',
          contentEn: 'Content EN 5',
          contentEs: 'Contenido ES 5',
          contentDe: 'Inhalt DE 5',
          contentIt: 'Contenuto IT 5',
        },
      });
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/articles/5');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(seeded.id);
      expect(res.body.articleNumber).toBe(5);
      expect(res.body.chapter).toBe('II');
      expect(res.body.titleFr).toBe('Principes');
      expect(res.body.titleEn).toBe('Principles');
      expect(res.body.contentEn).toBe('Content EN 5');
    });

    it('returns 404 when no article has the requested number', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/articles/999');
      expect(res.status).toBe(404);
    });

    it('returns 400 when :number is not a valid integer (ParseIntPipe)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/articles/not-a-number');
      expect(res.status).toBe(400);
    });
  });
});
