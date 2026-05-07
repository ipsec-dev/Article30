import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ChecklistAnswer, Role, VALID_SCREENING_IDS } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedScreening, seedUser } from './seed';

// Build a Record<string,string> with a valid ChecklistAnswer for every
// question in VALID_SCREENING_IDS. ScreeningsService.create asserts every
// id is present with a value from the ChecklistAnswer enum (see
// backend/src/modules/screenings/screenings.service.ts).
function allYesResponses(): Record<string, string> {
  const responses: Record<string, string> = {};
  for (const id of VALID_SCREENING_IDS) {
    responses[id] = ChecklistAnswer.YES;
  }
  return responses;
}

describe('screenings.controller (e2e)', () => {
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

  describe('GET /api/screenings', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/screenings');
      expect(res.status).toBe(401);
    });

    it('returns 403 for an EDITOR (not in AUDIT_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/screenings');
      expect(res.status).toBe(403);
    });

    it('returns 200 with a paginated shape for an AUDITOR', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'dpo-seed@example.test',
      });
      await seedScreening(testApp.prisma, dpo.id, { title: 'Seeded screening' });

      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/screenings');
      expect(res.status).toBe(200);
      // ScreeningsService.findAll returns { data, total, page, limit }.
      expect(res.body).toBeTypeOf('object');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
    });
  });

  describe('GET /api/screenings/:id', () => {
    it('returns 404 for an unknown id', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/screenings/00000000-0000-4000-8000-000000000000');
      expect(res.status).toBe(404);
    });

    it('returns 200 with the seeded screening for a valid id', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const screening = await seedScreening(testApp.prisma, user.id, {
        title: 'Seeded screening',
      });
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/screenings/${screening.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(screening.id);
      expect(res.body.title).toBe('Seeded screening');
    });
  });

  describe('POST /api/screenings', () => {
    it('returns 403 for an AUDITOR (not in WRITE_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/screenings')
        .set('x-xsrf-token', csrfToken)
        .send({ title: 'Test', responses: allYesResponses() });
      expect(res.status).toBe(403);
    });

    it('creates a screening for a DPO and persists the row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/screenings')
        .set('x-xsrf-token', csrfToken)
        .send({ title: 'E2E screening', responses: allYesResponses() });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('E2E screening');
      expect(res.body.verdict).toBe('GREEN');

      const row = await testApp.prisma.screening.findUnique({ where: { id: res.body.id } });
      expect(row).not.toBeNull();
      expect(row?.title).toBe('E2E screening');
      expect(row?.createdBy).toBe(user.id);
    });
  });

  describe('POST /api/screenings/:id/convert', () => {
    it('returns 403 for an AUDITOR (not in WRITE_ROLES)', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'dpo-convert@example.test',
      });
      const screening = await seedScreening(testApp.prisma, dpo.id, {
        responses: allYesResponses(),
      });

      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post(`/api/screenings/${screening.id}/convert`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
    });

    it('converts the screening to a treatment for a DPO and links them', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const screening = await seedScreening(testApp.prisma, user.id, {
        title: 'Convert me',
        responses: allYesResponses(),
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post(`/api/screenings/${screening.id}/convert`)
        .set('x-xsrf-token', csrfToken);
      expect([200, 201]).toContain(res.status);
      expect(res.body.treatmentId).toBeDefined();

      const treatment = await testApp.prisma.treatment.findUnique({
        where: { id: res.body.treatmentId },
      });
      expect(treatment).not.toBeNull();
      expect(treatment?.name).toBe('Convert me');

      const linked = await testApp.prisma.screening.findUnique({
        where: { id: screening.id },
      });
      expect(linked?.treatmentId).toBe(res.body.treatmentId);
    });
  });

  describe('GET /api/screenings/:id/pdf', () => {
    it('returns 401 without a session', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'dpo-pdf-anon@example.test',
      });
      const screening = await seedScreening(testApp.prisma, dpo.id);
      const res = await testApp.agent().get(`/api/screenings/${screening.id}/pdf`);
      expect(res.status).toBe(401);
    });

    it('returns 403 for an EDITOR (not in AUDIT_ROLES)', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'dpo-pdf-editor@example.test',
      });
      const screening = await seedScreening(testApp.prisma, dpo.id);

      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/screenings/${screening.id}/pdf`);
      expect(res.status).toBe(403);
    });

    it('returns a PDF body for an AUDITOR', async () => {
      const { user: dpo } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'dpo-pdf-ok@example.test',
      });
      const screening = await seedScreening(testApp.prisma, dpo.id, {
        responses: allYesResponses(),
      });

      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      // supertest buffers binary bodies into a Buffer when the response
      // Content-Type is not text/json; calling .buffer(true) explicitly
      // guarantees res.body is a Buffer we can size-check.
      const res = await agent.get(`/api/screenings/${screening.id}/pdf`).buffer(true);
      expect(res.status).toBe(200);
      expect(String(res.headers['content-type'] ?? '')).toMatch(/^application\/pdf/);
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect((res.body as Buffer).length).toBeGreaterThan(0);
    });
  });
});
