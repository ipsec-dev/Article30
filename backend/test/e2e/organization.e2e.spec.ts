import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs, primeCsrf } from './login';
import { seedUser } from './seed';

describe('organization.controller (e2e)', () => {
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

  describe('GET /api/organization', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/organization');
      expect(res.status).toBe(401);
    });

    // Note: the no-org-exists case is no longer reachable — seedUser auto-creates an Organization for AuthGuard's Membership invariant.

    it('returns 200 with the existing organization row when one exists', async () => {
      await testApp.prisma.organization.create({
        data: { slug: `test-org-${Date.now()}`, companyName: 'Acme SAS' },
      });
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/organization');
      expect(res.status).toBe(200);
      expect(res.body.companyName).toBe('Acme SAS');
      expect(typeof res.body.id).toBe('string');
    });
  });

  describe('PATCH /api/organization', () => {
    it('returns 401 without a session', async () => {
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent
        .patch('/api/organization')
        .set('x-xsrf-token', csrfToken)
        .send({ companyName: 'Acme' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for an AUDITOR (non-ADMIN)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch('/api/organization')
        .set('x-xsrf-token', csrfToken)
        .send({ companyName: 'Acme' });
      expect(res.status).toBe(403);
    });

    it('updates the organization for an ADMIN and persists the change', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch('/api/organization')
        .set('x-xsrf-token', csrfToken)
        .send({ companyName: 'Acme' });
      expect(res.status).toBe(200);
      expect(res.body.companyName).toBe('Acme');

      const row = await testApp.prisma.organization.findFirst();
      expect(row).not.toBeNull();
      expect(row?.companyName).toBe('Acme');
    });

    it('returns 400 when dpoEmail is not a valid email', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch('/api/organization')
        .set('x-xsrf-token', csrfToken)
        .send({ dpoEmail: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when freshnessThresholdMonths violates @Min(1)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch('/api/organization')
        .set('x-xsrf-token', csrfToken)
        .send({ freshnessThresholdMonths: 0 });
      expect(res.status).toBe(400);
    });
  });
});
