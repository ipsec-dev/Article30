import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedTreatment, seedUser } from './seed';

describe('alerts.controller (e2e)', () => {
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

  describe('GET /api/alerts', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/alerts');
      expect(res.status).toBe(401);
    });

    it('returns 403 for an unapproved user (ApprovedGuard)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO, { approved: false });
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/alerts');
      expect(res.status).toBe(403);
    });

    it('returns 200 with an empty items array and a zeroed summary when DB is empty', async () => {
      // AlertsService.getAlerts() returns { items: AlertItem[], summary: { total, critical, high, medium } }
      // (not a bare array — see backend/src/modules/alerts/alerts.service.ts).
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/alerts');
      expect(res.status).toBe(200);
      expect(res.body).toBeTypeOf('object');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items).toHaveLength(0);
      expect(res.body.summary).toEqual({ total: 0, critical: 0, high: 0, medium: 0 });
    });

    it('surfaces a TREATMENT_OVERDUE alert for a DRAFT treatment older than 30 days', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const treatment = await seedTreatment(testApp.prisma, user.id);
      // Treatments default to status=DRAFT. AlertsService.getOverdueTreatments()
      // matches DRAFT rows with updatedAt < (now - 30d). Prisma @updatedAt auto-
      // touches the column on every update, so we push it back via an update
      // whose payload matches the existing values (still triggers the auto-set)
      // and then override it in a raw patch to be safe.
      const backdated = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      await testApp.prisma.treatment.update({
        where: { id: treatment.id },
        data: { updatedAt: backdated },
      });

      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/alerts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThan(0);
      const overdue = res.body.items.find(
        (i: { type: string; entityId: string }) =>
          i.type === 'TREATMENT_OVERDUE' && i.entityId === treatment.id,
      );
      expect(overdue).toBeDefined();
      expect(overdue.severity).toBe('HIGH');
      expect(res.body.summary.total).toBeGreaterThan(0);
      expect(res.body.summary.high).toBeGreaterThan(0);
    });
  });
});
