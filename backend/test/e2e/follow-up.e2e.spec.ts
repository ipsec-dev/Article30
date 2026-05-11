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

  describe('GET /api/follow-up/attachments/:id/download', () => {
    async function seedAttachment(
      prisma: TestApp['prisma'],
      entityType: 'VIOLATION' | 'DSR',
      entityId: string,
      uploadedBy: string,
    ) {
      return prisma.followUpAttachment.create({
        data: {
          entityType,
          entityId,
          filename: 'evidence.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 13,
          storageKey: `follow-up/${entityType.toLowerCase()}/${entityId}/k`,
          sha256: 'a'.repeat(64),
          previousSha256: null,
          category: 'EVIDENCE',
          uploadedBy,
        },
      });
    }

    it('streams the bytes for a DPO viewing a VIOLATION attachment', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolation(testApp.prisma, user.id);
      const a = await seedAttachment(testApp.prisma, 'VIOLATION', v.id, user.id);
      const { agent } = await loginAs(testApp.app, user.email, password);

      const res = await agent.get(`/api/follow-up/attachments/${a.id}/download`).buffer(true);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('inline');
    });

    it('returns 404 for a soft-deleted attachment', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolation(testApp.prisma, user.id);
      const a = await seedAttachment(testApp.prisma, 'VIOLATION', v.id, user.id);
      await testApp.prisma.followUpAttachment.update({
        where: { id: a.id },
        data: {
          deletedAt: new Date(),
          storageKey: null,
          deletedBy: user.id,
          deletionReason: 'test',
        },
      });
      const { agent } = await loginAs(testApp.app, user.email, password);

      const res = await agent.get(`/api/follow-up/attachments/${a.id}/download`);
      expect(res.status).toBe(404);
    });

    it('returns 404 for PROCESS_OWNER on a VIOLATION they do not own', async () => {
      const { user: other } = await seedUser(testApp.prisma, Role.PROCESS_OWNER, {
        email: 'po-other@x.test',
      });
      const v = await seedViolation(testApp.prisma, other.id);
      const a = await seedAttachment(testApp.prisma, 'VIOLATION', v.id, other.id);

      const { user: self, password } = await seedUser(testApp.prisma, Role.PROCESS_OWNER, {
        email: 'po-self@x.test',
      });
      const { agent } = await loginAs(testApp.app, self.email, password);

      const res = await agent.get(`/api/follow-up/attachments/${a.id}/download`);
      expect(res.status).toBe(404);
    });
  });
});
