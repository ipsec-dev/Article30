import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role, Severity } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedUser } from './seed';

describe('follow-up.controllers (e2e)', () => {
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
    const throttlerStorage = testApp.app.get<{ storage?: Map<string, unknown> }>(ThrottlerStorage, {
      strict: false,
    });
    throttlerStorage?.storage?.clear();
  });

  async function seedViolation(prisma: TestApp['prisma'], createdBy: string) {
    return prisma.violation.create({
      data: {
        title: 'e2e',
        severity: Severity.LOW,
        awarenessAt: new Date(),
        createdBy,
      },
    });
  }

  describe('GET /api/follow-up/timeline/:entityType/:entityId', () => {
    it('AUDITOR can read', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const v = await seedViolation(testApp.prisma, user.id);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/follow-up/timeline/VIOLATION/${v.id}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/follow-up/comments', () => {
    it('AUDITOR is rejected with 403', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const v = await seedViolation(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/follow-up/comments').set('x-xsrf-token', csrfToken).send({
        entityType: 'VIOLATION',
        entityId: v.id,
        body: 'no permission',
        visibility: 'INTERNAL',
      });
      expect(res.status).toBe(403);
    });

    it('DPO can post', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolation(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/follow-up/comments').set('x-xsrf-token', csrfToken).send({
        entityType: 'VIOLATION',
        entityId: v.id,
        body: 'looks contained',
        visibility: 'INTERNAL',
      });
      expect(res.status).toBe(201);
      expect(res.body.body).toBe('looks contained');
    });
  });

  describe('GET /api/follow-up/comments/:entityType/:entityId', () => {
    it('AUDITOR sees only AUDITOR_VISIBLE comments', async () => {
      const { user: dpo, password: dpoPwd } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolation(testApp.prisma, dpo.id);

      const { agent: dpoAgent, csrfToken: dpoToken } = await loginAs(
        testApp.app,
        dpo.email,
        dpoPwd,
      );
      await dpoAgent.post('/api/follow-up/comments').set('x-xsrf-token', dpoToken).send({
        entityType: 'VIOLATION',
        entityId: v.id,
        body: 'internal',
        visibility: 'INTERNAL',
      });
      await dpoAgent.post('/api/follow-up/comments').set('x-xsrf-token', dpoToken).send({
        entityType: 'VIOLATION',
        entityId: v.id,
        body: 'auditor-visible',
        visibility: 'AUDITOR_VISIBLE',
      });

      // Auditor (single-tenant — every user shares the one org).
      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent: auditorAgent } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await auditorAgent.get(`/api/follow-up/comments/VIOLATION/${v.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].body).toBe('auditor-visible');
    });
  });

  describe('GET /api/follow-up/decisions/:entityType/:entityId', () => {
    it('AUDITOR can read decisions', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const v = await seedViolation(testApp.prisma, user.id);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/follow-up/decisions/VIOLATION/${v.id}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('DELETE /api/follow-up/attachments/:id', () => {
    it('AUDITOR is rejected (FOLLOW_UP_WRITE_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .delete('/api/follow-up/attachments/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
        .set('x-xsrf-token', csrfToken)
        .send({ deletionReason: 'test' });
      expect(res.status).toBe(403);
    });
  });
});
