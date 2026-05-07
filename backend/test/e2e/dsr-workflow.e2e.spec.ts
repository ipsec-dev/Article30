import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role, DsrType } from '@article30/shared';
import { DsrStatus } from '@prisma/client';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedUser } from './seed';

describe('dsr-workflow.controller (e2e)', () => {
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

  // Helper: seed a DSR in the org context of the given user
  async function seedDsrInOrg(status: DsrStatus = DsrStatus.RECEIVED) {
    return testApp.prisma.dataSubjectRequest.create({
      data: {
        type: DsrType.ACCESS,
        requesterName: 'Jane Doe',
        requesterEmail: 'jane@example.test',
        deadline: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        status,
      },
    });
  }

  // Helper: seed a treatment in the org
  async function seedTreatmentInOrg(createdBy: string) {
    return testApp.prisma.treatment.create({
      data: {
        name: `Treatment ${Date.now()}`,
        purpose: 'Test purpose',
        legalBasis: 'consent',
        personCategories: ['employees'],
        recipientTypes: ['internal'],
        securityMeasures: ['encryption'],
        sensitiveCategories: [],
        subPurposes: [],
        retentionPeriod: '5 years',
        createdBy,
      },
    });
  }

  // 1. PATCH /:id/transition — DPO transitions to ACKNOWLEDGED
  describe('PATCH /api/dsr/:id/transition', () => {
    it('DPO can transition RECEIVED → ACKNOWLEDGED', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsrInOrg();
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/dsr/${dsr.id}/transition`)
        .set('x-xsrf-token', csrfToken)
        .send({ target: 'ACKNOWLEDGED', payload: {} });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACKNOWLEDGED');
    });

    it('AUDITOR is rejected with 403 on transition', async () => {
      const { user: dpo, password: dpoPwd } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsrInOrg();

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent
        .patch(`/api/dsr/${dsr.id}/transition`)
        .set('x-xsrf-token', csrfToken)
        .send({ target: 'ACKNOWLEDGED', payload: {} });
      expect(res.status).toBe(403);
    });
  });

  // 2. POST /:id/pauses — DPO opens a pause
  describe('POST /api/dsr/:id/pauses', () => {
    it('DPO can open a pause', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsrInOrg();
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post(`/api/dsr/${dsr.id}/pauses`)
        .set('x-xsrf-token', csrfToken)
        .send({ reason: 'IDENTITY_VERIFICATION', reasonDetails: 'Awaiting ID docs.' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.reason).toBe('IDENTITY_VERIFICATION');
      expect(res.body.resumedAt).toBeNull();
    });
  });

  // 3. PATCH /:id/pauses/active/resume — DPO closes a pause
  describe('PATCH /api/dsr/:id/pauses/active/resume', () => {
    it('DPO can close (resume) an open pause', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsrInOrg();

      // Open a pause directly in the DB
      await testApp.prisma.dsrPauseInterval.create({
        data: {
          dsrId: dsr.id,
          reason: 'SCOPE_CLARIFICATION',
          startedBy: user.id,
          pausedAt: new Date(),
        },
      });

      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/dsr/${dsr.id}/pauses/active/resume`)
        .set('x-xsrf-token', csrfToken)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.resumedAt).toBeDefined();
    });
  });

  // 4. POST /:id/communications — DPO records communication
  describe('POST /api/dsr/:id/communications', () => {
    it('DPO can record a requester communication', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsrInOrg();
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post(`/api/dsr/${dsr.id}/communications`)
        .set('x-xsrf-token', csrfToken)
        .send({
          kind: 'ACKNOWLEDGEMENT',
          sentAt: new Date().toISOString(),
          channel: 'EMAIL',
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.kind).toBe('ACKNOWLEDGEMENT');
      expect(res.body.channel).toBe('EMAIL');
    });
  });

  // 5. AUDITOR read-only endpoints (pauses, communications, processing)
  describe('AUDITOR read-only sub-resources', () => {
    it('AUDITOR can read pauses list (200)', async () => {
      const { user: dpo, password: dpoPwd } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsrInOrg();

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent.get(`/api/dsr/${dsr.id}/pauses`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('AUDITOR can read communications list (200)', async () => {
      const { user: dpo, password: dpoPwd } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsrInOrg();

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent.get(`/api/dsr/${dsr.id}/communications`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('AUDITOR can read treatment-processing list (200)', async () => {
      const { user: dpo, password: dpoPwd } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsrInOrg();

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent.get(`/api/dsr/${dsr.id}/treatments/processing`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // 6. AUDITOR rejected on write endpoints
  describe('AUDITOR rejected on write endpoints', () => {
    it('AUDITOR is rejected with 403 on POST /:id/communications', async () => {
      const { user: dpo, password: dpoPwd } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsrInOrg();

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent
        .post(`/api/dsr/${dsr.id}/communications`)
        .set('x-xsrf-token', csrfToken)
        .send({
          kind: 'ACKNOWLEDGEMENT',
          sentAt: new Date().toISOString(),
          channel: 'EMAIL',
        });
      expect(res.status).toBe(403);
    });
  });

  // 7. PATCH /:id/treatments/:tid/processing — DPO upserts
  describe('PATCH /api/dsr/:id/treatments/:tid/processing', () => {
    it('DPO can upsert treatment processing', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsrInOrg();
      const treatment = await seedTreatmentInOrg(user.id);

      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/dsr/${dsr.id}/treatments/${treatment.id}/processing`)
        .set('x-xsrf-token', csrfToken)
        .send({
          actionTaken: 'ACCESS_EXPORT',
          vendorPropagationStatus: 'NOT_REQUIRED',
          findingsSummary: 'Found 3 records matching requester.',
        });
      expect(res.status).toBe(200);
      expect(res.body.actionTaken).toBe('ACCESS_EXPORT');
      expect(res.body.dsrId).toBe(dsr.id);
      expect(res.body.treatmentId).toBe(treatment.id);
    });

    it('AUDITOR is rejected with 403 on PATCH /:id/treatments/:tid/processing', async () => {
      const { user: dpo, password: dpoPwd } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsrInOrg();
      const treatment = await seedTreatmentInOrg(dpo.id);

      const { user: auditor, password: auditorPwd } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, auditor.email, auditorPwd);
      const res = await agent
        .patch(`/api/dsr/${dsr.id}/treatments/${treatment.id}/processing`)
        .set('x-xsrf-token', csrfToken)
        .send({
          actionTaken: 'NONE',
          vendorPropagationStatus: 'NOT_REQUIRED',
        });
      expect(res.status).toBe(403);
    });
  });

  // 8. POST /:id/treatments/:treatmentId/link — DPO links treatment
  describe('POST /api/dsr/:id/treatments/:treatmentId/link', () => {
    it('DPO can link a treatment via the new /link endpoint', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsrInOrg();
      const treatment = await seedTreatmentInOrg(user.id);

      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post(`/api/dsr/${dsr.id}/treatments/${treatment.id}/link`)
        .set('x-xsrf-token', csrfToken)
        .send({});
      expect(res.status).toBe(201);
      expect(res.body.dsrId).toBe(dsr.id);
      expect(res.body.treatmentId).toBe(treatment.id);
      expect(res.body.actionTaken).toBe('NONE');
    });
  });
});
