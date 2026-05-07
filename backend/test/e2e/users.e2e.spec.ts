import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedUser } from './seed';

describe('users.controller (e2e)', () => {
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

  describe('GET /api/users', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/users');
      expect(res.status).toBe(401);
    });

    it('returns 403 for a DPO (class-level ADMIN gate)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/users');
      expect(res.status).toBe(403);
    });

    it('returns 200 with an array of users for an ADMIN', async () => {
      const { user: admin, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent } = await loginAs(testApp.app, admin.email, password);
      const res = await agent.get('/api/users');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((u: { id: string }) => u.id === admin.id)).toBe(true);
    });
  });

  describe('PATCH /api/users/:id/approve', () => {
    it('returns 403 for a DPO', async () => {
      const target = await seedUser(testApp.prisma, Role.AUDITOR, { approved: false });
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/users/${target.user.id}/approve`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
    });

    it('approves the target user for an ADMIN and persists approved=true', async () => {
      const target = await seedUser(testApp.prisma, Role.AUDITOR, { approved: false });
      const { user: admin, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, admin.email, password);
      const res = await agent
        .patch(`/api/users/${target.user.id}/approve`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);

      const row = await testApp.prisma.user.findUnique({ where: { id: target.user.id } });
      expect(row?.approved).toBe(true);
    });
  });

  describe('PATCH /api/users/:id/role', () => {
    it('changes the role for an ADMIN and persists it', async () => {
      const target = await seedUser(testApp.prisma, Role.AUDITOR);
      const { user: admin, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, admin.email, password);
      const res = await agent
        .patch(`/api/users/${target.user.id}/role`)
        .set('x-xsrf-token', csrfToken)
        .send({ role: Role.EDITOR });
      expect(res.status).toBe(200);

      const row = await testApp.prisma.user.findUnique({ where: { id: target.user.id } });
      expect(row?.role).toBe(Role.EDITOR);
    });

    it('returns 400 for an invalid role value', async () => {
      const target = await seedUser(testApp.prisma, Role.AUDITOR);
      const { user: admin, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, admin.email, password);
      const res = await agent
        .patch(`/api/users/${target.user.id}/role`)
        .set('x-xsrf-token', csrfToken)
        .send({ role: 'INVALID' });
      expect(res.status).toBe(400);
    });

    it('returns 403 when the ADMIN targets their own id (self-guard)', async () => {
      const { user: admin, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, admin.email, password);
      const res = await agent
        .patch(`/api/users/${admin.id}/role`)
        .set('x-xsrf-token', csrfToken)
        .send({ role: Role.EDITOR });
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/users/:id/deactivate', () => {
    it('deactivates the target user for an ADMIN and persists approved=false', async () => {
      const target = await seedUser(testApp.prisma, Role.AUDITOR, { approved: true });
      const { user: admin, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, admin.email, password);
      const res = await agent
        .patch(`/api/users/${target.user.id}/deactivate`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);

      const row = await testApp.prisma.user.findUnique({ where: { id: target.user.id } });
      expect(row?.approved).toBe(false);
    });

    it('returns 403 when the ADMIN targets their own id (self-guard)', async () => {
      const { user: admin, password } = await seedUser(testApp.prisma, Role.ADMIN);
      const { agent, csrfToken } = await loginAs(testApp.app, admin.email, password);
      const res = await agent
        .patch(`/api/users/${admin.id}/deactivate`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
    });
  });
});
