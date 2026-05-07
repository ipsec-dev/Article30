import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedRegulatoryUpdate, seedRssFeed, seedUser } from './seed';
import { RegulatoryUpdatesService } from '../../src/modules/regulatory-updates/regulatory-updates.service';

describe('regulatory-updates.controller (e2e)', () => {
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
    // RegulatoryUpdatesService.sync() performs live HTTP calls to every enabled
    // RSS feed URL. Spy on the prototype to avoid hitting the network during
    // the /sync endpoint test.
    vi.spyOn(RegulatoryUpdatesService.prototype, 'sync').mockResolvedValue({ newEntries: 0 });
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

  describe('GET /api/regulatory-updates', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/regulatory-updates');
      expect(res.status).toBe(401);
    });

    it('returns 403 for an EDITOR (not in AUDIT_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/regulatory-updates');
      expect(res.status).toBe(403);
    });

    it('returns 200 with pagination shape filtered by source & impactLevel for an AUDITOR', async () => {
      const feed = await seedRssFeed(testApp.prisma, { label: 'CNIL' });
      await seedRegulatoryUpdate(testApp.prisma, feed.id, {
        source: 'cnil',
        impactLevel: 'HIGH',
      });
      await seedRegulatoryUpdate(testApp.prisma, feed.id, {
        source: 'edpb',
        impactLevel: 'LOW',
      });
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/regulatory-updates?source=cnil&impactLevel=HIGH');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ page: 1, limit: 20, total: 1 });
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].source).toBe('cnil');
      expect(res.body.data[0].impactLevel).toBe('HIGH');
    });
  });

  describe('GET /api/regulatory-updates/new-count', () => {
    it('returns the count of NEW-status updates for an AUDITOR', async () => {
      const feed = await seedRssFeed(testApp.prisma);
      await seedRegulatoryUpdate(testApp.prisma, feed.id, { status: 'NEW' });
      await seedRegulatoryUpdate(testApp.prisma, feed.id, { status: 'NEW' });
      await seedRegulatoryUpdate(testApp.prisma, feed.id, { status: 'REVIEWED' });
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/regulatory-updates/new-count');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 2 });
    });
  });

  describe('POST /api/regulatory-updates/sync', () => {
    it('returns 403 for an AUDITOR (not in ADMIN_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/regulatory-updates/sync').set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
    });

    it('returns 201 with the mocked sync result for an ADMIN without real HTTP', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/regulatory-updates/sync').set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ newEntries: 0 });
    });
  });

  describe('PATCH /api/regulatory-updates/:id/impact', () => {
    it('returns 403 for an AUDITOR (not in WRITE_ROLES)', async () => {
      const feed = await seedRssFeed(testApp.prisma);
      const update = await seedRegulatoryUpdate(testApp.prisma, feed.id);
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/regulatory-updates/${update.id}/impact`)
        .set('x-xsrf-token', csrfToken)
        .send({ impactLevel: 'HIGH' });
      expect(res.status).toBe(403);
    });

    it('updates impactLevel for an EDITOR and persists the change', async () => {
      const feed = await seedRssFeed(testApp.prisma);
      const update = await seedRegulatoryUpdate(testApp.prisma, feed.id);
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/regulatory-updates/${update.id}/impact`)
        .set('x-xsrf-token', csrfToken)
        .send({ impactLevel: 'HIGH' });
      expect(res.status).toBe(200);
      expect(res.body.impactLevel).toBe('HIGH');

      const row = await testApp.prisma.regulatoryUpdate.findUnique({ where: { id: update.id } });
      expect(row?.impactLevel).toBe('HIGH');
    });
  });

  describe('PATCH /api/regulatory-updates/:id/status', () => {
    it('updates status for an EDITOR and persists the change', async () => {
      const feed = await seedRssFeed(testApp.prisma);
      const update = await seedRegulatoryUpdate(testApp.prisma, feed.id, { status: 'NEW' });
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/regulatory-updates/${update.id}/status`)
        .set('x-xsrf-token', csrfToken)
        .send({ status: 'REVIEWED' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('REVIEWED');

      const row = await testApp.prisma.regulatoryUpdate.findUnique({ where: { id: update.id } });
      expect(row?.status).toBe('REVIEWED');
    });
  });

  describe('PATCH /api/regulatory-updates/:id/saved — role gating', () => {
    it('rejects AUDITOR with 403', async () => {
      const feed = await seedRssFeed(testApp.prisma);
      const update = await seedRegulatoryUpdate(testApp.prisma, feed.id);
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/regulatory-updates/${update.id}/saved`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
    });

    it('allows EDITOR with 200', async () => {
      const feed = await seedRssFeed(testApp.prisma);
      const update = await seedRegulatoryUpdate(testApp.prisma, feed.id);
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/regulatory-updates/${update.id}/saved`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);
      expect(res.body.saved).toBe(true);

      const updated = await testApp.prisma.regulatoryUpdate.findUnique({
        where: { id: update.id },
      });
      expect(updated?.saved).toBe(true);
    });
  });
});
