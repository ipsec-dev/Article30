import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedUser } from './seed';

describe('recitals.controller (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await cleanupDatabase(testApp.prisma);
    await testApp.prisma.regulationRecital.deleteMany();
    await testApp.close();
  });

  afterEach(async () => {
    // cleanupDatabase() does not include regulation_recitals (it's reference
    // data not owned by users), so we clear it separately here to avoid
    // recitalNumber unique-constraint collisions across tests.
    await testApp.prisma.regulationRecital.deleteMany();
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

  describe('GET /api/recitals', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/recitals');
      expect(res.status).toBe(401);
    });

    it('returns { data, total, page, limit } with seeded recitals for an approved user', async () => {
      await testApp.prisma.regulationRecital.createMany({
        data: [
          {
            recitalNumber: 1,
            contentFr: 'Contenu FR 1',
            contentEn: 'Content EN 1',
            contentEs: 'Contenido ES 1',
            contentDe: 'Inhalt DE 1',
            contentIt: 'Contenuto IT 1',
          },
          {
            recitalNumber: 2,
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
      const res = await agent.get('/api/recitals');
      expect(res.status).toBe(200);
      expect(res.body).toBeTypeOf('object');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      // Service orders by recitalNumber asc.
      expect(res.body.data[0].recitalNumber).toBe(1);
      expect(res.body.data[1].recitalNumber).toBe(2);
      expect(res.body.data[0].contentEn).toBe('Content EN 1');
    });
  });

  describe('GET /api/recitals/:number', () => {
    it('returns the matching recital when it exists', async () => {
      const seeded = await testApp.prisma.regulationRecital.create({
        data: {
          recitalNumber: 7,
          contentFr: 'Contenu FR 7',
          contentEn: 'Content EN 7',
          contentEs: 'Contenido ES 7',
          contentDe: 'Inhalt DE 7',
          contentIt: 'Contenuto IT 7',
        },
      });
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/recitals/7');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(seeded.id);
      expect(res.body.recitalNumber).toBe(7);
      expect(res.body.contentFr).toBe('Contenu FR 7');
      expect(res.body.contentEn).toBe('Content EN 7');
      expect(res.body.contentEs).toBe('Contenido ES 7');
      expect(res.body.contentDe).toBe('Inhalt DE 7');
      expect(res.body.contentIt).toBe('Contenuto IT 7');
    });

    it('returns 404 when no recital has the requested number', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/recitals/999');
      expect(res.status).toBe(404);
    });

    it('returns 400 when :number is not a valid integer (ParseIntPipe)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/recitals/not-a-number');
      expect(res.status).toBe(400);
    });
  });
});
