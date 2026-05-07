import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from '../e2e/app-factory';
import { loginAs, primeCsrf } from '../e2e/login';
import { seedUser } from '../e2e/seed';

describe('GET/PATCH /api/organization/settings', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
    // Clear any rows the previous test file left behind so findFirst() in
    // our service is deterministic.
    await cleanupDatabase(testApp.prisma);
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
    testApp.mailSink.length = 0;
  });

  it('returns the four toggles defaulted to true and accepts a PATCH', async () => {
    const { user: admin, password } = await seedUser(testApp.prisma, Role.ADMIN, {
      email: 'admin@example.test',
    });
    // Org row required so the GET reads the persisted defaults rather than
    // the in-memory fallback.
    await testApp.prisma.organization.create({
      data: { slug: `set-${Date.now()}`, locale: 'fr' },
    });

    const { agent, csrfToken } = await loginAs(testApp.app, admin.email, password);

    const get1 = await agent.get('/api/organization/settings');
    expect(get1.status).toBe(200);
    expect(get1.body).toMatchObject({
      notifyDsrDeadline: true,
      notifyVendorDpaExpiry: true,
      notifyTreatmentReview: true,
      notifyViolation72h: true,
    });

    const patch = await agent
      .patch('/api/organization/settings')
      .set('x-xsrf-token', csrfToken)
      .send({ notifyDsrDeadline: false });
    expect(patch.status).toBe(200);
    expect(patch.body.notifyDsrDeadline).toBe(false);

    const get2 = await agent.get('/api/organization/settings');
    expect(get2.body.notifyDsrDeadline).toBe(false);
    expect(get2.body.notifyVendorDpaExpiry).toBe(true);
  });

  it('returns 401 without a session', async () => {
    const { agent } = await primeCsrf(testApp.app);
    const res = await agent.get('/api/organization/settings');
    expect(res.status).toBe(401);
  });

  it('returns 403 when a non-admin/non-DPO calls it', async () => {
    const { user: editor, password } = await seedUser(testApp.prisma, Role.EDITOR, {
      email: 'editor@example.test',
    });
    const { agent } = await loginAs(testApp.app, editor.email, password);
    const res = await agent.get('/api/organization/settings');
    expect(res.status).toBe(403);
  });

  it('returns 400 on empty PATCH body', async () => {
    const { user: admin, password } = await seedUser(testApp.prisma, Role.ADMIN, {
      email: 'admin@example.test',
    });
    await testApp.prisma.organization.create({
      data: { slug: `set-${Date.now()}`, locale: 'fr' },
    });
    const { agent, csrfToken } = await loginAs(testApp.app, admin.email, password);
    const res = await agent
      .patch('/api/organization/settings')
      .set('x-xsrf-token', csrfToken)
      .send({});
    expect(res.status).toBe(400);
  });

  it('writes an audit-log entry on PATCH', async () => {
    const { user: admin, password } = await seedUser(testApp.prisma, Role.ADMIN, {
      email: 'admin@example.test',
    });
    await testApp.prisma.organization.create({
      data: { slug: `set-${Date.now()}`, locale: 'fr' },
    });
    const { agent, csrfToken } = await loginAs(testApp.app, admin.email, password);
    const res = await agent
      .patch('/api/organization/settings')
      .set('x-xsrf-token', csrfToken)
      .send({ notifyVendorDpaExpiry: false });
    expect(res.status).toBe(200);

    const audit = await testApp.prisma.auditLog.findFirst({
      where: { entity: 'organization-settings', performedBy: admin.id },
    });
    expect(audit).not.toBeNull();
    expect(audit!.action).toBe('UPDATE');
    expect(audit!.oldValue).toMatchObject({ notifyVendorDpaExpiry: true });
    expect(audit!.newValue).toMatchObject({ notifyVendorDpaExpiry: false });
  });
});
