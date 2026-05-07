import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs, primeCsrf } from './login';
import { seedUser } from './seed';

// A valid itemId from the static catalog at
// shared/src/constants/checklist.ts (CHECKLIST_ITEMS). The service
// guards the upsert against VALID_CHECKLIST_ITEM_IDS and throws
// BadRequestException for anything else.
const VALID_ITEM_ID = 'art33-breach';
const INVALID_ITEM_ID = 'not-a-real-itemId';

describe('checklist.controller (e2e)', () => {
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

  describe('GET /api/checklist/responses', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/checklist/responses');
      expect(res.status).toBe(401);
    });

    it('returns 200 with an array for an approved user', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/checklist/responses');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PUT /api/checklist/:itemId', () => {
    it('returns 401 without a session', async () => {
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent
        .put(`/api/checklist/${VALID_ITEM_ID}`)
        .set('x-xsrf-token', csrfToken)
        .send({ response: 'YES' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for an AUDITOR (not in WRITE_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .put(`/api/checklist/${VALID_ITEM_ID}`)
        .set('x-xsrf-token', csrfToken)
        .send({ response: 'YES' });
      expect(res.status).toBe(403);
    });

    it('upserts the response row as DPO and persists response=YES', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .put(`/api/checklist/${VALID_ITEM_ID}`)
        .set('x-xsrf-token', csrfToken)
        .send({ response: 'YES' });
      // Nest defaults PUT handlers that return a body to 200.
      expect([200, 201]).toContain(res.status);
      expect(res.body.itemId).toBe(VALID_ITEM_ID);
      expect(res.body.response).toBe('YES');
      expect(res.body.respondedBy).toBe(user.id);

      const row = await testApp.prisma.checklistResponse.findUnique({
        where: { itemId: VALID_ITEM_ID },
      });
      expect(row).not.toBeNull();
      expect(row?.response).toBe('YES');
      expect(row?.respondedBy).toBe(user.id);
    });

    it('returns 400 when response is not a valid ChecklistAnswer enum value', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .put(`/api/checklist/${VALID_ITEM_ID}`)
        .set('x-xsrf-token', csrfToken)
        .send({ response: 'INVALID' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for an unknown itemId (service rejects against VALID_CHECKLIST_ITEM_IDS)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .put(`/api/checklist/${INVALID_ITEM_ID}`)
        .set('x-xsrf-token', csrfToken)
        .send({ response: 'YES' });
      expect(res.status).toBe(400);
    });
  });
});
