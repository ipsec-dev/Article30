import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedRssFeed, seedUser } from './seed';
import { RssFeedsService } from '../../src/modules/rss-feeds/rss-feeds.service';
import type { CreateRssFeedDto } from '../../src/modules/rss-feeds/dto/create-rss-feed.dto';

describe('rss-feeds.controller (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await cleanupDatabase(testApp.prisma);
    await testApp.close();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    // RssFeedsService.create() performs a live fetch() against the given URL
    // to validate it returns a well-formed RSS feed. That would make the
    // POST test depend on external network (and the example URL would fail).
    // Spy on the prototype and bypass the network call by writing the row
    // straight through the injected PrismaService.
    vi.spyOn(RssFeedsService.prototype, 'create').mockImplementation(async function (
      this: RssFeedsService,
      dto: CreateRssFeedDto,
    ) {
      return (this as unknown as { prisma: TestApp['prisma'] }).prisma.rssFeed.create({
        data: { label: dto.label, url: dto.url },
      });
    });
  });

  afterEach(async () => {
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
    vi.restoreAllMocks();
  });

  describe('GET /api/rss-feeds', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/rss-feeds');
      expect(res.status).toBe(401);
    });

    it('returns 403 for an AUDITOR (class-level ADMIN_ROLES gate)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/rss-feeds');
      expect(res.status).toBe(403);
    });

    it('returns 200 with the seeded feeds for an ADMIN', async () => {
      await seedRssFeed(testApp.prisma, {
        label: 'CNIL',
        url: 'https://example.test/cnil-feed.xml',
      });
      const { user, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/rss-feeds');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].label).toBe('CNIL');
    });
  });

  describe('POST /api/rss-feeds', () => {
    it('returns 403 for an AUDITOR', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/rss-feeds')
        .set('x-xsrf-token', csrfToken)
        .send({ label: 'CNIL', url: 'https://example.test/feed.xml' });
      expect(res.status).toBe(403);
    });

    it('creates a new feed for an ADMIN and persists it to the DB', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/rss-feeds')
        .set('x-xsrf-token', csrfToken)
        .send({ label: 'CNIL', url: 'https://example.test/feed.xml' });
      expect(res.status).toBe(201);
      expect(res.body.label).toBe('CNIL');
      expect(res.body.url).toBe('https://example.test/feed.xml');
      expect(typeof res.body.id).toBe('string');

      const rows = await testApp.prisma.rssFeed.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0].label).toBe('CNIL');
      expect(rows[0].url).toBe('https://example.test/feed.xml');
    });
  });

  describe('PATCH /api/rss-feeds/:id', () => {
    it('returns 403 for an AUDITOR', async () => {
      const feed = await seedRssFeed(testApp.prisma);
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/rss-feeds/${feed.id}`)
        .set('x-xsrf-token', csrfToken)
        .send({ enabled: false });
      expect(res.status).toBe(403);
    });

    it('updates the feed for an ADMIN and persists the change', async () => {
      const feed = await seedRssFeed(testApp.prisma, { enabled: true });
      const { user, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/rss-feeds/${feed.id}`)
        .set('x-xsrf-token', csrfToken)
        .send({ enabled: false });
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);

      const row = await testApp.prisma.rssFeed.findUnique({ where: { id: feed.id } });
      expect(row?.enabled).toBe(false);
    });
  });

  describe('DELETE /api/rss-feeds/:id', () => {
    it('returns 403 for an AUDITOR', async () => {
      const feed = await seedRssFeed(testApp.prisma);
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.delete(`/api/rss-feeds/${feed.id}`).set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
    });

    it('deletes the feed for an ADMIN', async () => {
      const feed = await seedRssFeed(testApp.prisma);
      const { user, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.delete(`/api/rss-feeds/${feed.id}`).set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);

      const row = await testApp.prisma.rssFeed.findUnique({ where: { id: feed.id } });
      expect(row).toBeNull();
    });
  });
});
