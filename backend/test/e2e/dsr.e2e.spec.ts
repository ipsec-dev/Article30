import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DsrType, Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs, primeCsrf } from './login';
import { seedDsr, seedUser } from './seed';

describe('dsr.controller (e2e)', () => {
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
    // leak across tests sharing one source IP (the 3/60s public submit cap
    // would otherwise trip across repeated public-submit specs).
    const throttlerStorage = testApp.app.get<{ storage?: Map<string, unknown> }>(ThrottlerStorage, {
      strict: false,
    });
    throttlerStorage?.storage?.clear();
    testApp.mailSink.length = 0;
  });

  // --------------------------- POST /submit ----------------------------

  describe('POST /api/dsr/submit (public)', () => {
    it('creates a DSR row for a valid public submission without an auth session', async () => {
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent.post('/api/dsr/submit').set('x-xsrf-token', csrfToken).send({
        type: DsrType.ACCESS,
        requesterName: 'Jane Doe',
        requesterEmail: 'jane@example.test',
      });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.deadline).toBeDefined();
      const row = await testApp.prisma.dataSubjectRequest.findUnique({
        where: { id: res.body.id },
      });
      expect(row).not.toBeNull();
      expect(row?.requesterEmail).toBe('jane@example.test');
      expect(row?.type).toBe(DsrType.ACCESS);
    });

    it('returns 400 when type is missing from the public submission', async () => {
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent
        .post('/api/dsr/submit')
        .set('x-xsrf-token', csrfToken)
        .send({ requesterName: 'Jane', requesterEmail: 'jane@example.test' });
      expect(res.status).toBe(400);
    });
  });

  // ------------------------------ GET / --------------------------------

  describe('GET /api/dsr', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/dsr');
      expect(res.status).toBe(401);
    });

    it('returns 403 for an EDITOR (not in DSR_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/dsr');
      expect(res.status).toBe(403);
    });

    it('returns 200 with { data, total, page, limit } for a DPO', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      await seedDsr(testApp.prisma, { requesterEmail: 'seeded@example.test' });
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/dsr');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
    });
  });

  // ---------------------------- GET /stats -----------------------------

  describe('GET /api/dsr/stats', () => {
    it('returns 200 for an AUDITOR (in AUDIT_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/dsr/stats');
      expect(res.status).toBe(200);
      expect(res.body.total).toBeDefined();
      expect(res.body.byStatus).toBeDefined();
      expect(res.body.byType).toBeDefined();
    });

    it('returns 403 for an EDITOR (not in AUDIT_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/dsr/stats');
      expect(res.status).toBe(403);
    });
  });

  // ------------------------------ POST / -------------------------------

  describe('POST /api/dsr', () => {
    it('returns 403 for an AUDITOR (not in DSR_ROLES write)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/dsr').set('x-xsrf-token', csrfToken).send({
        type: DsrType.ACCESS,
        requesterName: 'Jane',
        requesterEmail: 'jane@example.test',
      });
      expect(res.status).toBe(403);
    });

    it('creates a DSR for a DPO and persists the row with createdBy', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/dsr').set('x-xsrf-token', csrfToken).send({
        type: DsrType.ACCESS,
        requesterName: 'Jane Doe',
        requesterEmail: 'jane@example.test',
      });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      const row = await testApp.prisma.dataSubjectRequest.findUnique({
        where: { id: res.body.id },
      });
      expect(row).not.toBeNull();
      expect(row?.createdBy).toBe(user.id);
    });
  });

  // ----------------------------- PATCH /:id ----------------------------

  describe('PATCH /api/dsr/:id', () => {
    it('updates a DSR for a DPO and returns the updated row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsr(testApp.prisma);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/dsr/${dsr.id}`)
        .set('x-xsrf-token', csrfToken)
        .send({ responseNotes: 'updated' });
      expect(res.status).toBe(200);
      expect(res.body.responseNotes).toBe('updated');
    });
  });

  // ---------------------------- DELETE /:id ----------------------------

  describe('DELETE /api/dsr/:id', () => {
    it('deletes the DSR for a DPO (in DELETE_ROLES) and removes the row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const dsr = await seedDsr(testApp.prisma);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.delete(`/api/dsr/${dsr.id}`).set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);
      const row = await testApp.prisma.dataSubjectRequest.findUnique({ where: { id: dsr.id } });
      expect(row).toBeNull();
    });
  });
});
