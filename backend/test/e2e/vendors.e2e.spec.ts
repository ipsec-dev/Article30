import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs, primeCsrf } from './login';
import { seedAssessment, seedUser, seedVendor } from './seed';

const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

describe('vendors.controller (e2e)', () => {
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

  // ------------------------------- Vendor CRUD ------------------------------

  describe('GET /api/vendors', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/vendors');
      expect(res.status).toBe(401);
    });

    it('returns 200 with a paginated shape for an approved DPO', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      await seedVendor(testApp.prisma, user.id);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/vendors');
      expect(res.status).toBe(200);
      // VendorsService.findAll returns { data, total, page, limit }.
      expect(res.body).toBeTypeOf('object');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
    });
  });

  describe('GET /api/vendors/:id', () => {
    it('returns 404 for an unknown id', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/vendors/${UNKNOWN_UUID}`);
      expect(res.status).toBe(404);
    });

    it('returns 200 with the seeded vendor for a valid id', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const vendor = await seedVendor(testApp.prisma, user.id, { name: 'Seeded Vendor' });
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/vendors/${vendor.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(vendor.id);
      expect(res.body.name).toBe('Seeded Vendor');
    });
  });

  describe('POST /api/vendors', () => {
    it('returns 401 without a session', async () => {
      // Prime CSRF so csrfMiddleware doesn't 403 before AuthGuard runs.
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent
        .post('/api/vendors')
        .set('x-xsrf-token', csrfToken)
        .send({ name: 'ACME Corp' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for an AUDITOR (not in WRITE_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/vendors')
        .set('x-xsrf-token', csrfToken)
        .send({ name: 'ACME Corp' });
      expect(res.status).toBe(403);
    });

    it('creates a vendor for a DPO and persists the row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/vendors')
        .set('x-xsrf-token', csrfToken)
        .send({ name: 'ACME Corp' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      const row = await testApp.prisma.vendor.findUnique({ where: { id: res.body.id } });
      expect(row).not.toBeNull();
      expect(row?.name).toBe('ACME Corp');
      expect(row?.createdBy).toBe(user.id);
    });
  });

  describe('PATCH /api/vendors/:id', () => {
    it('updates fields for a DPO and returns the updated vendor', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const vendor = await seedVendor(testApp.prisma, user.id, { name: 'ACME Corp' });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/vendors/${vendor.id}`)
        .set('x-xsrf-token', csrfToken)
        .send({ name: 'ACME Renamed' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('ACME Renamed');
    });
  });

  describe('DELETE /api/vendors/:id', () => {
    it('returns 403 for an EDITOR (not in DELETE_ROLES)', async () => {
      const { user: creator } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'creator@example.test',
      });
      const vendor = await seedVendor(testApp.prisma, creator.id);
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR, {
        email: 'editor@example.test',
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.delete(`/api/vendors/${vendor.id}`).set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
      const row = await testApp.prisma.vendor.findUnique({ where: { id: vendor.id } });
      expect(row).not.toBeNull();
    });

    it('deletes the vendor for a DPO and removes the row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const vendor = await seedVendor(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.delete(`/api/vendors/${vendor.id}`).set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);
      const row = await testApp.prisma.vendor.findUnique({ where: { id: vendor.id } });
      expect(row).toBeNull();
    });
  });

  // --------------------------- Assessment sub-routes ------------------------

  describe('GET /api/vendors/:vendorId/assessment', () => {
    it('returns 200 with null body when no assessment exists', async () => {
      // VendorAssessmentsService.findByVendor uses findFirst and returns null;
      // Nest serializes null as an empty body with 200.
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const vendor = await seedVendor(testApp.prisma, user.id);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/vendors/${vendor.id}/assessment`);
      expect(res.status).toBe(200);
      // supertest parses an empty/null JSON body as {} — both acceptable.
      expect(res.body === null || Object.keys(res.body).length === 0).toBe(true);
    });

    it('returns 200 with the seeded assessment when one exists', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const vendor = await seedVendor(testApp.prisma, user.id);
      const assessment = await seedAssessment(testApp.prisma, vendor.id, user.id);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/vendors/${vendor.id}/assessment`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(assessment.id);
      expect(res.body.vendorId).toBe(vendor.id);
    });
  });

  describe('POST /api/vendors/:vendorId/assessment', () => {
    it('returns 403 for an AUDITOR (not in WRITE_ROLES)', async () => {
      const { user: creator } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'creator@example.test',
      });
      const vendor = await seedVendor(testApp.prisma, creator.id);
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR, {
        email: 'auditor@example.test',
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post(`/api/vendors/${vendor.id}/assessment`)
        .set('x-xsrf-token', csrfToken)
        .send({});
      expect(res.status).toBe(403);
    });

    it('creates an assessment for a DPO and persists the row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const vendor = await seedVendor(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post(`/api/vendors/${vendor.id}/assessment`)
        .set('x-xsrf-token', csrfToken)
        .send({});
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.vendorId).toBe(vendor.id);
      expect(res.body.status).toBe('PENDING');
      const row = await testApp.prisma.vendorAssessment.findUnique({
        where: { id: res.body.id },
      });
      expect(row).not.toBeNull();
      expect(row?.createdBy).toBe(user.id);
    });
  });

  describe('PATCH /api/vendors/:vendorId/assessment/:assessmentId', () => {
    it('updates answers for a DPO and sets status to IN_PROGRESS', async () => {
      // Answers must use the uppercase enum {'YES'|'PARTIAL'|'NO'|'NA'};
      // anything else is stored as-is but skipped by computeScore.
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const vendor = await seedVendor(testApp.prisma, user.id);
      const assessment = await seedAssessment(testApp.prisma, vendor.id, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/vendors/${vendor.id}/assessment/${assessment.id}`)
        .set('x-xsrf-token', csrfToken)
        .send({ answers: [{ questionId: 'q1', answer: 'YES' }] });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
    });
  });

  describe('PATCH /api/vendors/:vendorId/assessment/:assessmentId/submit', () => {
    it('submits an assessment for a DPO and sets status to SUBMITTED', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const vendor = await seedVendor(testApp.prisma, user.id);
      const assessment = await seedAssessment(testApp.prisma, vendor.id, user.id, {
        status: 'PENDING',
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/vendors/${vendor.id}/assessment/${assessment.id}/submit`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUBMITTED');
      const row = await testApp.prisma.vendorAssessment.findUnique({
        where: { id: assessment.id },
      });
      expect(row?.status).toBe('SUBMITTED');
    });
  });

  describe('PATCH /api/vendors/:vendorId/assessment/:assessmentId/review', () => {
    it('returns 403 for an EDITOR (not in VALIDATE_ROLES)', async () => {
      const { user: creator } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'creator@example.test',
      });
      const vendor = await seedVendor(testApp.prisma, creator.id);
      const assessment = await seedAssessment(testApp.prisma, vendor.id, creator.id, {
        status: 'SUBMITTED',
      });
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR, {
        email: 'editor@example.test',
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/vendors/${vendor.id}/assessment/${assessment.id}/review`)
        .set('x-xsrf-token', csrfToken)
        .send({ status: 'APPROVED' });
      expect(res.status).toBe(403);
    });

    it('approves a submitted assessment for a DPO and records the reviewer', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const vendor = await seedVendor(testApp.prisma, user.id);
      const assessment = await seedAssessment(testApp.prisma, vendor.id, user.id, {
        status: 'SUBMITTED',
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/vendors/${vendor.id}/assessment/${assessment.id}/review`)
        .set('x-xsrf-token', csrfToken)
        .send({ status: 'APPROVED' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('APPROVED');
      const row = await testApp.prisma.vendorAssessment.findUnique({
        where: { id: assessment.id },
      });
      expect(row?.status).toBe('APPROVED');
      expect(row?.reviewedBy).toBe(user.id);
    });
  });
});
