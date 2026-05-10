import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { LinkedEntity, Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs, primeCsrf } from './login';
import { seedDocument, seedTreatment, seedUser } from './seed';

describe('documents.controller (e2e)', () => {
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

  // --------------------------- POST /upload ----------------------------

  describe('POST /api/documents/upload', () => {
    it('returns 401 without a session', async () => {
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent
        .post('/api/documents/upload')
        .set('x-xsrf-token', csrfToken)
        .field('linkedEntity', 'TREATMENT')
        .field('linkedEntityId', '00000000-0000-4000-8000-000000000000')
        .attach('file', Buffer.from('pdf-content'), {
          filename: 'x.pdf',
          contentType: 'application/pdf',
        });
      expect(res.status).toBe(401);
    });

    it('returns 403 for an AUDITOR (not in WRITE_ROLES)', async () => {
      const { user: owner } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'owner@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, owner.id);
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR, {
        email: 'auditor@example.test',
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/documents/upload')
        .set('x-xsrf-token', csrfToken)
        .field('linkedEntity', 'TREATMENT')
        .field('linkedEntityId', treatment.id)
        .attach('file', Buffer.from('pdf-content'), {
          filename: 'x.pdf',
          contentType: 'application/pdf',
        });
      expect(res.status).toBe(403);
    });

    it('returns 201 for a DPO with a valid PDF and persists the Document row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/documents/upload')
        .set('x-xsrf-token', csrfToken)
        .field('linkedEntity', 'TREATMENT')
        .field('linkedEntityId', treatment.id)
        .attach('file', Buffer.from('pdf-content-bytes'), {
          filename: 'policy.pdf',
          contentType: 'application/pdf',
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.s3Key).toMatch(/^treatment\//);
      expect(res.body.linkedEntity).toBe(LinkedEntity.TREATMENT);
      expect(res.body.linkedEntityId).toBe(treatment.id);
      expect(res.body.mimeType).toBe('application/pdf');

      const rows = await testApp.prisma.document.findMany({
        where: { linkedEntityId: treatment.id },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].s3Key.startsWith('treatment/')).toBe(true);
      expect(rows[0].uploadedBy).toBe(user.id);
    });

    it('returns 400 when no file is attached', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/documents/upload')
        .set('x-xsrf-token', csrfToken)
        .field('linkedEntity', 'TREATMENT')
        .field('linkedEntityId', treatment.id);
      expect(res.status).toBe(400);
    });

    it('returns 400 for a disallowed MIME type (text/plain)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/documents/upload')
        .set('x-xsrf-token', csrfToken)
        .field('linkedEntity', 'TREATMENT')
        .field('linkedEntityId', treatment.id)
        .attach('file', Buffer.from('just some text'), {
          filename: 'note.txt',
          contentType: 'text/plain',
        });
      expect(res.status).toBe(400);
    });

    it('returns 413 when the file exceeds the 10MB FileInterceptor limit', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const oversized = Buffer.alloc(11 * 1024 * 1024, 0);
      const res = await agent
        .post('/api/documents/upload')
        .set('x-xsrf-token', csrfToken)
        .field('linkedEntity', 'TREATMENT')
        .field('linkedEntityId', treatment.id)
        .attach('file', oversized, {
          filename: 'big.pdf',
          contentType: 'application/pdf',
        });
      expect(res.status).toBe(413);
    });
  });

  // ------------------------------ GET / --------------------------------

  describe('GET /api/documents', () => {
    it('returns 200 with the seeded documents for an approved user', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const doc = await seedDocument(testApp.prisma, 'TREATMENT', treatment.id, user.id);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(
        `/api/documents?entity=TREATMENT&entityId=${encodeURIComponent(treatment.id)}`,
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(doc.id);
      expect(res.body[0].linkedEntityId).toBe(treatment.id);
    });
  });

  // ------------------------ GET /:id/download --------------------------

  describe('GET /api/documents/:id/download', () => {
    it('streams the bytes for an approved DPO with the right headers', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const doc = await seedDocument(testApp.prisma, 'TREATMENT', treatment.id, user.id);
      const { agent } = await loginAs(testApp.app, user.email, password);

      const res = await agent.get(`/api/documents/${doc.id}/download`).buffer(true);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf'); // Document.mimeType from seed
      expect(res.headers['content-disposition']).toContain('inline');
      expect(res.headers['content-disposition']).toContain(encodeURIComponent(doc.filename));
      expect(res.headers['accept-ranges']).toBe('bytes');
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('returns 206 with Content-Range when a Range header is sent', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const doc = await seedDocument(testApp.prisma, 'TREATMENT', treatment.id, user.id);
      const { agent } = await loginAs(testApp.app, user.email, password);

      const res = await agent
        .get(`/api/documents/${doc.id}/download`)
        .set('Range', 'bytes=0-4')
        .buffer(true);

      expect(res.status).toBe(206);
      expect(res.headers['content-range']).toMatch(/^bytes 0-/);
    });

    it('returns 404 for PROCESS_OWNER who does not own the linked treatment', async () => {
      const { user: ownerOther } = await seedUser(testApp.prisma, Role.PROCESS_OWNER, {
        email: 'other-po@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, ownerOther.id);
      const doc = await seedDocument(testApp.prisma, 'TREATMENT', treatment.id, ownerOther.id);

      const { user: self, password } = await seedUser(testApp.prisma, Role.PROCESS_OWNER, {
        email: 'self-po@example.test',
      });
      const { agent } = await loginAs(testApp.app, self.email, password);

      const res = await agent.get(`/api/documents/${doc.id}/download`);
      expect(res.status).toBe(404);
    });

    it('returns 200 for an AUDITOR (no ownership scoping)', async () => {
      const { user: ownerOther } = await seedUser(testApp.prisma, Role.PROCESS_OWNER, {
        email: 'other-po-2@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, ownerOther.id);
      const doc = await seedDocument(testApp.prisma, 'TREATMENT', treatment.id, ownerOther.id);

      const { user: auditor, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, auditor.email, password);

      const res = await agent.get(`/api/documents/${doc.id}/download`).buffer(true);
      expect(res.status).toBe(200);
    });

    it('returns 404 for a non-existent document', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get(`/api/documents/00000000-0000-0000-0000-000000000000/download`);
      expect(res.status).toBe(404);
    });

    it('encodes RFC 8187 reserved chars in Content-Disposition for filenames with apostrophes', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const doc = await seedDocument(testApp.prisma, 'TREATMENT', treatment.id, user.id, {
        filename: "O'Reilly's policy.pdf",
      });
      const { agent } = await loginAs(testApp.app, user.email, password);

      const res = await agent.get(`/api/documents/${doc.id}/download`).buffer(true);

      expect(res.status).toBe(200);
      // Apostrophes must be percent-encoded (%27) so they do not terminate the language tag
      expect(res.headers['content-disposition']).toBe(
        "inline; filename*=UTF-8''O%27Reilly%27s%20policy.pdf",
      );
    });
  });

  // ---------------------------- DELETE /:id ----------------------------

  describe('DELETE /api/documents/:id', () => {
    it('returns 403 for an AUDITOR', async () => {
      const { user: owner } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'owner@example.test',
      });
      const treatment = await seedTreatment(testApp.prisma, owner.id);
      const doc = await seedDocument(testApp.prisma, 'TREATMENT', treatment.id, owner.id);
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR, {
        email: 'auditor@example.test',
      });
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.delete(`/api/documents/${doc.id}`).set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(403);
      const stillThere = await testApp.prisma.document.findUnique({ where: { id: doc.id } });
      expect(stillThere).not.toBeNull();
    });

    it('returns 200 for a DPO and removes the DB row', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      const doc = await seedDocument(testApp.prisma, 'TREATMENT', treatment.id, user.id);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.delete(`/api/documents/${doc.id}`).set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(200);
      const gone = await testApp.prisma.document.findUnique({ where: { id: doc.id } });
      expect(gone).toBeNull();
    });
  });
});
