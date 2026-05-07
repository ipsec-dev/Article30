import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs } from './login';
import { seedUser } from './seed';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';

describe('audit-log.controller (e2e)', () => {
  let testApp: TestApp;
  let auditLogService: AuditLogService;

  beforeAll(async () => {
    testApp = await createTestApp();
    auditLogService = testApp.app.get(AuditLogService);
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

  describe('GET /api/audit-log/verify', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/audit-log/verify');
      expect(res.status).toBe(401);
    });

    it('returns 403 for an EDITOR (not in AUDIT_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/audit-log/verify');
      expect(res.status).toBe(403);
    });

    it('returns 200 with { valid: true, totalRows: 0 } for AUDITOR on an empty table', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/audit-log/verify');
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.totalRows).toBe(0);
      expect(typeof res.body.checkedAt).toBe('string');
    });
  });

  describe('GET /api/audit-log', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/audit-log');
      expect(res.status).toBe(401);
    });

    it('returns 403 for an EDITOR (not in AUDIT_ROLES)', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.EDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/audit-log');
      expect(res.status).toBe(403);
    });

    it('returns an empty page for AUDITOR on an empty table', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/audit-log');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ data: [], total: 0, page: 1, limit: 20 });
    });

    it('returns all seeded entries for AUDITOR when no entity filter is set', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      await auditLogService.create({
        action: 'UPDATE',
        entity: 'user',
        entityId: 'user-1',
        performedBy: null,
      });
      await auditLogService.create({
        action: 'CREATE',
        entity: 'treatment',
        entityId: 'treatment-1',
        performedBy: null,
      });
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/audit-log');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.data).toHaveLength(2);
    });

    it('filters by entity when ?entity=user is passed', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
      await auditLogService.create({
        action: 'UPDATE',
        entity: 'user',
        entityId: 'user-1',
        performedBy: null,
      });
      await auditLogService.create({
        action: 'CREATE',
        entity: 'treatment',
        entityId: 'treatment-1',
        performedBy: null,
      });
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/audit-log?entity=user');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].entity).toBe('user');
    });
  });
});
