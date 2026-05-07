import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role, TreatmentStatus } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedTreatment, seedUser } from './seed';
import { TreatmentsService } from '../../src/modules/treatments/treatments.service';

const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

describe('treatments.controller (e2e)', () => {
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

  // ------------------------------- GET / --------------------------------

  describe('GET /api/treatments', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/treatments');
      expect(res.status).toBe(401);
    });

    it('returns 200 with { data, total, page, limit } for an approved DPO with one seeded treatment', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      await seedTreatment(testApp.prisma, user.id, { name: 'Seeded T' });
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/treatments');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
    });
  });

  // ------------------------------ GET /:id ------------------------------

  describe('GET /api/treatments/:id', () => {
    it('returns 404 for an unknown id', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/treatments/${UNKNOWN_UUID}`);
      expect(res.status).toBe(404);
    });

    it('returns 200 with the seeded treatment for a valid id', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id, { name: 'Seeded T' });
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/treatments/${treatment.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(treatment.id);
      expect(res.body.name).toBe('Seeded T');
    });
  });

  // ------------------------------ POST / --------------------------------

  describe('POST /api/treatments', () => {
    it('returns 403 for an AUDITOR (not in TREATMENT_WRITE_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/treatments')
        .set('x-xsrf-token', csrfToken)
        .send({ name: 'T1' });
      expect(res.status).toBe(403);
    });

    it('creates a treatment for an EDITOR and persists the row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/treatments')
        .set('x-xsrf-token', csrfToken)
        .send({ name: 'New Treatment' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('New Treatment');
      const row = await testApp.prisma.treatment.findUnique({ where: { id: res.body.id } });
      expect(row).not.toBeNull();
      expect(row?.createdBy).toBe(user.id);
    });

    it('returns 400 when name is missing (DTO @IsString on required field)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/treatments')
        .set('x-xsrf-token', csrfToken)
        .send({ purpose: 'No name provided' });
      expect(res.status).toBe(400);
    });
  });

  // ----------------------------- PATCH /:id -----------------------------

  describe('PATCH /api/treatments/:id', () => {
    it('updates a treatment for an EDITOR and returns the updated row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/treatments/${treatment.id}`)
        .set('x-xsrf-token', csrfToken)
        .send({ purpose: 'new' });
      expect(res.status).toBe(200);
      expect(res.body.purpose).toBe('new');
    });
  });

  // ---------------------------- DELETE /:id -----------------------------

  describe('DELETE /api/treatments/:id', () => {
    it('returns 403 for an EDITOR (not in DELETE_ROLES)', async () => {
      const { user: creator } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'creator@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, creator.id);
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR, {
        email: 'editor@example.test',
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .delete(`/api/treatments/${treatment.id}`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
      const row = await testApp.prisma.treatment.findUnique({ where: { id: treatment.id } });
      expect(row).not.toBeNull();
    });

    it('deletes the treatment for a DPO and removes the row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .delete(`/api/treatments/${treatment.id}`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);
      const row = await testApp.prisma.treatment.findUnique({ where: { id: treatment.id } });
      expect(row).toBeNull();
    });
  });

  // ------------------------- PATCH /:id/validate ------------------------

  describe('PATCH /api/treatments/:id/validate', () => {
    it('returns 403 for an EDITOR (not in VALIDATE_ROLES)', async () => {
      const { user: creator } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'creator@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, creator.id);
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR, {
        email: 'editor@example.test',
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/treatments/${treatment.id}/validate`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
    });

    it('validates a treatment for a DPO (different creator — separation of duties) and sets status/validatedBy/validatedAt', async () => {
      // Creator must differ from validator: TreatmentsService.validate() throws
      // ForbiddenException when createdBy === userId.
      const { user: creator } = await seedUser(testApp.prisma, Role.EDITOR, {
        email: 'creator@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, creator.id);
      const { user, password } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'dpo@example.test',
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/treatments/${treatment.id}/validate`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);
      const row = await testApp.prisma.treatment.findUnique({ where: { id: treatment.id } });
      expect(row?.status).toBe(TreatmentStatus.VALIDATED);
      expect(row?.validatedBy).toBe(user.id);
      expect(row?.validatedAt).not.toBeNull();
    });

    it('blocks a creator from validating their own treatment when org.enforceSeparationOfDuties=true', async () => {
      await testApp.prisma.organization.create({
        data: { slug: `test-org-${Date.now()}`, enforceSeparationOfDuties: true },
      });
      const { user, password } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'solo@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/treatments/${treatment.id}/validate`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
      const row = await testApp.prisma.treatment.findUnique({ where: { id: treatment.id } });
      expect(row?.status).toBe(TreatmentStatus.DRAFT);
    });

    it('lets a creator validate their own treatment when org.enforceSeparationOfDuties=false (single-validator org)', async () => {
      await testApp.prisma.organization.create({
        data: { slug: `test-org-${Date.now()}`, enforceSeparationOfDuties: false },
      });
      const { user, password } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'solo@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/treatments/${treatment.id}/validate`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);
      const row = await testApp.prisma.treatment.findUnique({ where: { id: treatment.id } });
      expect(row?.status).toBe(TreatmentStatus.VALIDATED);
      expect(row?.validatedBy).toBe(user.id);
    });
  });

  // ------------------------ PATCH /:id/invalidate -----------------------

  describe('PATCH /api/treatments/:id/invalidate', () => {
    it('invalidates a previously-validated treatment for a DPO', async () => {
      const { user: creator } = await seedUser(testApp.prisma, Role.EDITOR, {
        email: 'creator@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, creator.id, {
        status: TreatmentStatus.VALIDATED,
        validatedBy: creator.id,
        validatedAt: new Date(),
      });
      const { user, password } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'dpo@example.test',
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/treatments/${treatment.id}/invalidate`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);
      const row = await testApp.prisma.treatment.findUnique({ where: { id: treatment.id } });
      expect(row?.status).toBe(TreatmentStatus.DRAFT);
      expect(row?.validatedBy).toBeNull();
      expect(row?.validatedAt).toBeNull();
    });

    it('lets a creator invalidate their own treatment when org.enforceSeparationOfDuties=false', async () => {
      await testApp.prisma.organization.create({
        data: { slug: `test-org-${Date.now()}`, enforceSeparationOfDuties: false },
      });
      const { user, password } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'solo@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, user.id, {
        status: TreatmentStatus.VALIDATED,
        validatedBy: user.id,
        validatedAt: new Date(),
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/treatments/${treatment.id}/invalidate`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);
      const row = await testApp.prisma.treatment.findUnique({ where: { id: treatment.id } });
      expect(row?.status).toBe(TreatmentStatus.DRAFT);
      expect(row?.validatedBy).toBeNull();
    });
  });

  // ---------------------- PATCH /:id/mark-reviewed ----------------------

  describe('PATCH /api/treatments/:id/mark-reviewed', () => {
    it('returns 403 for an EDITOR (only ADMIN/DPO allowed)', async () => {
      const { user: creator } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'creator@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, creator.id);
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR, {
        email: 'editor@example.test',
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/treatments/${treatment.id}/mark-reviewed`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
    });

    it('marks a treatment as reviewed for a DPO and sets lastReviewedAt', async () => {
      // markReviewed requires an Organization row to compute nextReviewAt.
      await testApp.prisma.organization.create({ data: { slug: `test-org-${Date.now()}` } });
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .patch(`/api/treatments/${treatment.id}/mark-reviewed`)
        .set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);
      const row = await testApp.prisma.treatment.findUnique({ where: { id: treatment.id } });
      expect(row?.lastReviewedAt).not.toBeNull();
    });
  });

  // ---------------------------- GET /export -----------------------------

  describe('GET /api/treatments/export', () => {
    it('returns 403 for an EDITOR (not in EXPORT_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/treatments/export');
      expect(res.status).toBe(403);
    });

    it('streams a CSV body for an AUDITOR (in EXPORT_ROLES)', async () => {
      const { user: creator } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'creator@example.test',
      });
      await seedTreatment(testApp.prisma, creator.id, { name: 'Exported T' });
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR, {
        email: 'auditor@example.test',
      });
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/treatments/export');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/^text\/csv/);
      // supertest returns a string for text/* responses.
      expect(typeof res.text).toBe('string');
      expect(res.text.length).toBeGreaterThan(0);
    });
  });

  // -------------------- TreatmentsService.create with tx ---------------

  describe('TreatmentsService.create with tx', () => {
    it('rolls back the treatment when the surrounding transaction throws', async () => {
      const { user } = await seedUser(testApp.prisma, Role.DPO);
      const service = testApp.app.get(TreatmentsService);

      await expect(
        testApp.prisma.$transaction(async tx => {
          await service.create({ name: 'tx-rollback-target' }, user.id, tx);
          throw new Error('forced rollback');
        }),
      ).rejects.toThrow('forced rollback');

      const found = await testApp.prisma.treatment.findFirst({
        where: { name: 'tx-rollback-target' },
      });
      expect(found).toBeNull();
    });

    it('persists the treatment when the surrounding transaction commits', async () => {
      const { user } = await seedUser(testApp.prisma, Role.DPO);
      const service = testApp.app.get(TreatmentsService);

      const created = await testApp.prisma.$transaction(async tx => {
        return service.create({ name: 'tx-commit-target' }, user.id, tx);
      });

      expect(created.id).toBeDefined();
      const found = await testApp.prisma.treatment.findUnique({ where: { id: created.id } });
      expect(found).not.toBeNull();
      expect(found?.refNumber).toBe(created.refNumber);
    });
  });

  // ------------------------- GET /:id/export-pdf ------------------------

  describe('GET /api/treatments/:id/export-pdf', () => {
    it('returns 403 for an EDITOR (only ADMIN/DPO allowed)', async () => {
      const { user: creator } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'creator@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, creator.id);
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR, {
        email: 'editor@example.test',
      });
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/treatments/${treatment.id}/export-pdf`);
      expect(res.status).toBe(403);
    });

    it('streams a PDF buffer for a DPO', async () => {
      // exportPdf requires an Organization row.
      await testApp.prisma.organization.create({ data: { slug: `test-org-${Date.now()}` } });
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .get(`/api/treatments/${treatment.id}/export-pdf`)
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
