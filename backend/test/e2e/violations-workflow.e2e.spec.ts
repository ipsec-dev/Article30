import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role, Severity } from '@article30/shared';
import { ViolationStatus } from '@prisma/client';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedUser } from './seed';

describe('violations-workflow.controller (e2e)', () => {
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

  // Helper: seed a violation owned by the given user
  async function seedViolationInOrg(
    userId: string,
    status: ViolationStatus = ViolationStatus.RECEIVED,
  ) {
    return testApp.prisma.violation.create({
      data: {
        title: `Workflow e2e violation ${Date.now()}`,
        severity: Severity.MEDIUM,
        awarenessAt: new Date(),
        createdBy: userId,
        status,
      },
    });
  }

  // 1. PATCH /:id/transition — DPO can transition to DISMISSED
  describe('PATCH /api/violations/:id/transition', () => {
    it('DPO can transition RECEIVED → DISMISSED', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/violations/${v.id}/transition`)
        .set('x-xsrf-token', csrfToken)
        .send({
          target: 'DISMISSED',
          payload: { dismissalReason: 'False alarm — no breach at all.' },
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DISMISSED');
    });

    it('AUDITOR is rejected with 403 on transition', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(dpo.id);

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent
        .patch(`/api/violations/${v.id}/transition`)
        .set('x-xsrf-token', csrfToken)
        .send({ target: 'TRIAGED', payload: {} });
      expect(res.status).toBe(403);
    });
  });

  // 2. POST /:id/risk-assessment
  describe('POST /api/violations/:id/risk-assessment', () => {
    it('WRITE_ROLES (DPO) can create a risk assessment', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post(`/api/violations/${v.id}/risk-assessment`)
        .set('x-xsrf-token', csrfToken)
        .send({
          likelihood: 'MEDIUM',
          severity: 'HIGH',
          affectedDataCategories: ['email', 'name'],
          crossBorder: false,
          potentialConsequences:
            'Unauthorised disclosure of personal data could cause reputational harm.',
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.likelihood).toBe('MEDIUM');
      expect(res.body.severity).toBe('HIGH');
    });

    it('AUDITOR is rejected with 403 on POST risk-assessment', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(dpo.id);

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent
        .post(`/api/violations/${v.id}/risk-assessment`)
        .set('x-xsrf-token', csrfToken)
        .send({
          likelihood: 'LOW',
          severity: 'LOW',
          affectedDataCategories: ['email'],
          crossBorder: false,
          potentialConsequences: 'Minor inconvenience only.',
        });
      expect(res.status).toBe(403);
    });
  });

  // 3. GET /:id/risk-assessment
  describe('GET /api/violations/:id/risk-assessment', () => {
    it('AUDITOR can read current risk assessment', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(dpo.id);

      // Seed assessment directly in DB
      await testApp.prisma.breachRiskAssessment.create({
        data: {
          violationId: v.id,
          likelihood: 'HIGH',
          severity: 'HIGH',
          computedRiskLevel: 'HIGH',
          affectedDataCategories: ['health'],
          crossBorder: true,
          potentialConsequences: 'Severe impact on data subjects.',
          assessedBy: dpo.id,
        },
      });

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent.get(`/api/violations/${v.id}/risk-assessment`);
      expect(res.status).toBe(200);
      expect(res.body.likelihood).toBe('HIGH');
    });
  });

  // 4. GET /:id/filings
  describe('GET /api/violations/:id/filings', () => {
    it('AUDITOR can read filings list (empty initially)', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(dpo.id);

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent.get(`/api/violations/${v.id}/filings`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });

  // 5. POST /:id/action-items
  describe('POST /api/violations/:id/action-items', () => {
    it('WRITE_ROLES (DPO) can create an action item', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post(`/api/violations/${v.id}/action-items`)
        .set('x-xsrf-token', csrfToken)
        .send({
          title: 'Patch the exposed endpoint',
          ownerId: user.id,
          deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Patch the exposed endpoint');
      expect(res.body.status).toBe('PENDING');
    });

    it('AUDITOR is rejected with 403 on POST action-items', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(dpo.id);

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent
        .post(`/api/violations/${v.id}/action-items`)
        .set('x-xsrf-token', csrfToken)
        .send({
          title: 'Should be blocked',
          ownerId: auditor.id,
          deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        });
      expect(res.status).toBe(403);
    });
  });

  // 6. PATCH /:id/action-items/:actionItemId
  describe('PATCH /api/violations/:id/action-items/:actionItemId', () => {
    it('WRITE_ROLES (DPO) can update an action item to IN_PROGRESS', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(user.id);

      // Seed action item directly
      const item = await testApp.prisma.remediationActionItem.create({
        data: {
          violationId: v.id,
          title: 'Review logs',
          ownerId: user.id,
          deadline: new Date(Date.now() + 3 * 24 * 3600 * 1000),
        },
      });

      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/violations/${v.id}/action-items/${item.id}`)
        .set('x-xsrf-token', csrfToken)
        .send({ status: 'IN_PROGRESS' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
    });
  });

  // 7. POST /:id/regulator-interactions
  describe('POST /api/violations/:id/regulator-interactions', () => {
    it('VALIDATE_ROLES (DPO) can record a regulator interaction', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post(`/api/violations/${v.id}/regulator-interactions`)
        .set('x-xsrf-token', csrfToken)
        .send({
          direction: 'OUTBOUND',
          kind: 'OTHER',
          occurredAt: new Date().toISOString(),
          summary: 'Initial contact with CNIL to notify of potential breach.',
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.direction).toBe('OUTBOUND');
    });

    it('EDITOR (WRITE_ROLES but not VALIDATE_ROLES) is rejected on regulator-interactions POST', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(dpo.id);

      const { user: editor, password: editorPwd } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, editor.email, editorPwd);
      const res = await agent
        .post(`/api/violations/${v.id}/regulator-interactions`)
        .set('x-xsrf-token', csrfToken)
        .send({
          direction: 'OUTBOUND',
          kind: 'OTHER',
          occurredAt: new Date().toISOString(),
          summary: 'Should be blocked for editors.',
        });
      expect(res.status).toBe(403);
    });
  });

  // 8. GET /:id/regulator-interactions
  describe('GET /api/violations/:id/regulator-interactions', () => {
    it('AUDITOR can read regulator interactions list', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(dpo.id);

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent.get(`/api/violations/${v.id}/regulator-interactions`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // 9. GET /:id/action-items
  describe('GET /api/violations/:id/action-items', () => {
    it('AUDITOR can read action items list', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(dpo.id);

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent.get(`/api/violations/${v.id}/action-items`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // 10. GET /:id/persons-notifications
  describe('GET /api/violations/:id/persons-notifications', () => {
    it('AUDITOR can read persons-notifications list (empty initially)', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO);
      const v = await seedViolationInOrg(dpo.id);

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent.get(`/api/violations/${v.id}/persons-notifications`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });
});
