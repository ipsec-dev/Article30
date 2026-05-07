import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role, Severity } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs, primeCsrf } from './login';
import { seedUser, seedViolation } from './seed';

describe('violations.controller (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await cleanupDatabase(testApp.prisma);
    await testApp.close();
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
  });

  describe('GET /api/violations', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/violations');
      expect(res.status).toBe(401);
    });

    it('returns 200 with a paginated shape for an approved DPO', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      await seedViolation(testApp.prisma, user.id);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/violations');
      expect(res.status).toBe(200);
      // ViolationsService.findAll returns { data, total, page, limit }
      // (see backend/src/modules/violations/violations.service.ts).
      expect(res.body).toBeTypeOf('object');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(typeof res.body.total).toBe('number');
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
    });
  });

  describe('GET /api/violations/:id', () => {
    it('returns 404 for an unknown id', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/violations/00000000-0000-4000-8000-000000000000');
      expect(res.status).toBe(404);
    });

    it('returns 200 with the seeded violation for a valid id', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const violation = await seedViolation(testApp.prisma, user.id, {
        title: 'Seeded violation',
      });
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/violations/${violation.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(violation.id);
      expect(res.body.title).toBe('Seeded violation');
    });
  });

  describe('POST /api/violations', () => {
    it('returns 401 without a session', async () => {
      // Prime CSRF so the request reaches AuthGuard (which returns 401);
      // otherwise csrfMiddleware rejects the missing token with 403 first.
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent.post('/api/violations').set('x-xsrf-token', csrfToken).send({
        title: 'Test',
        severity: Severity.HIGH,
        discoveredAt: new Date().toISOString(),
      });
      expect(res.status).toBe(401);
    });

    it('returns 403 for an AUDITOR (not in WRITE_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/violations').set('x-xsrf-token', csrfToken).send({
        title: 'Test',
        severity: Severity.HIGH,
        discoveredAt: new Date().toISOString(),
      });
      expect(res.status).toBe(403);
    });

    it('creates a violation for a DPO and persists the row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/violations').set('x-xsrf-token', csrfToken).send({
        title: 'Test',
        severity: Severity.HIGH,
        discoveredAt: new Date().toISOString(),
      });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      const row = await testApp.prisma.violation.findUnique({ where: { id: res.body.id } });
      expect(row).not.toBeNull();
      expect(row?.title).toBe('Test');
      expect(row?.severity).toBe(Severity.HIGH);
      expect(row?.createdBy).toBe(user.id);
    });

    it('returns 400 when required title is missing', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/violations').set('x-xsrf-token', csrfToken).send({
        severity: Severity.HIGH,
        discoveredAt: new Date().toISOString(),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/violations/:id', () => {
    it('updates fields for a DPO and returns the updated violation', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const violation = await seedViolation(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/violations/${violation.id}`)
        .set('x-xsrf-token', csrfToken)
        .send({ description: 'updated' });
      expect(res.status).toBe(200);
      expect(res.body.description).toBe('updated');
    });
  });
});
