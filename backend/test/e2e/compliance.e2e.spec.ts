import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedUser } from './seed';

describe('compliance.controller (e2e)', () => {
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

  // -------------------------- GET /fine-exposure --------------------------

  describe('GET /api/compliance/fine-exposure', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/compliance/fine-exposure');
      expect(res.status).toBe(401);
    });

    it('returns 200 with the fine-exposure shape for an approved DPO', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/compliance/fine-exposure');
      expect(res.status).toBe(200);
      // Service returns { annualTurnover, maxFine, estimatedExposure, complianceScore }.
      // Without an Organization row, annualTurnover / maxFine / estimatedExposure are null
      // and complianceScore is a number (0 when there's no data).
      expect(res.body).toHaveProperty('complianceScore');
      expect(typeof res.body.complianceScore).toBe('number');
      expect(res.body).toHaveProperty('annualTurnover');
      expect(res.body).toHaveProperty('maxFine');
      expect(res.body).toHaveProperty('estimatedExposure');
    });
  });

  // ------------------- POST /snapshot — role gating -----------------------

  describe('POST /api/compliance/snapshot — role gating', () => {
    it('rejects AUDITOR with 403', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/compliance/snapshot').set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
    });

    it('allows DPO with 201', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/compliance/snapshot').set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(201);
    });
  });

  // ------------------------------ GET /score ------------------------------

  describe('GET /api/compliance/score', () => {
    it('returns 200 with { score, breakdown } for an approved DPO', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/compliance/score');
      expect(res.status).toBe(200);
      expect(typeof res.body.score).toBe('number');
      expect(res.body.breakdown).toBeDefined();
      expect(res.body.breakdown.checklist).toBeDefined();
      expect(res.body.breakdown.freshness).toBeDefined();
      expect(res.body.breakdown.violations).toBeDefined();
    });
  });

  // ---------------------------- GET /snapshots ----------------------------

  describe('GET /api/compliance/snapshots', () => {
    it('returns 200 with an array for an approved DPO', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/compliance/snapshots');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });

  // ---------------------------- POST /snapshot ----------------------------

  describe('POST /api/compliance/snapshot', () => {
    it('returns 403 for an EDITOR (not in VALIDATE_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/compliance/snapshot').set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
      const count = await testApp.prisma.complianceSnapshot.count();
      expect(count).toBe(0);
    });

    it('creates a snapshot for a DPO (in VALIDATE_ROLES) and persists the row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const before = await testApp.prisma.complianceSnapshot.count();
      const res = await agent.post('/api/compliance/snapshot').set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      const after = await testApp.prisma.complianceSnapshot.count();
      expect(after).toBe(before + 1);
    });
  });

  // -------------------------- GET /audit-package --------------------------

  describe('GET /api/compliance/audit-package', () => {
    it('returns 403 for an EDITOR (not in EXPORT_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/compliance/audit-package');
      expect(res.status).toBe(403);
    });

    it('streams a zip buffer for an AUDITOR (in EXPORT_ROLES)', async () => {
      // The bundled report PDF reads organization fields; seed a row for safety.
      await testApp.prisma.organization.create({ data: { slug: `test-org-${Date.now()}` } });
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .get('/api/compliance/audit-package')
        .buffer(true)
        .parse((response, cb) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => cb(null, Buffer.concat(chunks)));
        });
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/zip/);
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect((res.body as Buffer).length).toBeGreaterThan(0);
    });
  });

  // ----------------------------- GET /report ------------------------------

  describe('GET /api/compliance/report', () => {
    it('returns 403 for an EDITOR (not in AUDIT_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/compliance/report');
      expect(res.status).toBe(403);
    });

    it('streams a PDF buffer for an AUDITOR (in AUDIT_ROLES)', async () => {
      // generateReport reads organization fields conditionally; seed a row for safety.
      await testApp.prisma.organization.create({ data: { slug: `test-org-${Date.now()}` } });
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .get('/api/compliance/report')
        .buffer(true)
        .parse((response, cb) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => cb(null, Buffer.concat(chunks)));
        });
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect((res.body as Buffer).length).toBeGreaterThan(0);
    });
  });
});
