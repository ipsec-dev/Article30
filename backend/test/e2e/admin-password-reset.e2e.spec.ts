import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs, primeCsrf } from './login';
import { seedUser } from './seed';

describe('admin-password-reset (e2e)', () => {
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
    testApp.mailSink.length = 0;
  });

  it('issues a resetUrl an admin can hand to a target user, consumable via /reset-password', async () => {
    const { user: admin, password: adminPass } = await seedUser(testApp.prisma, Role.ADMIN, {
      email: 'admin@example.test',
    });
    const { user: target } = await seedUser(testApp.prisma, Role.EDITOR, {
      email: 'target@example.test',
    });

    const { agent, csrfToken } = await loginAs(testApp.app, admin.email, adminPass);
    const res = await agent
      .patch(`/api/users/${target.id}/admin-reset-password`)
      .set('x-xsrf-token', csrfToken)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.resetUrl).toMatch(/^https:\/\/app\.test\/reset-password\?token=[a-f0-9]{64}$/);
    expect(res.body.expiresInMinutes).toBe(60);

    // Extract token and consume it.
    const token = new URL(res.body.resetUrl).searchParams.get('token')!;
    const { agent: anon, csrfToken: anonCsrf } = await primeCsrf(testApp.app);
    const resetRes = await anon
      .post('/api/auth/reset-password')
      .set('x-xsrf-token', anonCsrf)
      .send({ token, newPassword: 'Newstrongpass1' });
    expect(resetRes.status).toBe(201);

    // Target can now log in with the new password.
    const { agent: postLogin } = await loginAs(testApp.app, target.email, 'Newstrongpass1');
    const me = await postLogin.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(target.email);
  });

  it('returns 403 when an admin targets themselves', async () => {
    const { user: admin, password: adminPass } = await seedUser(testApp.prisma, Role.ADMIN, {
      email: 'admin@example.test',
    });
    const { agent, csrfToken } = await loginAs(testApp.app, admin.email, adminPass);
    const res = await agent
      .patch(`/api/users/${admin.id}/admin-reset-password`)
      .set('x-xsrf-token', csrfToken)
      .send({});
    expect(res.status).toBe(403);
  });

  it('returns 403 when a non-admin attempts to call the endpoint', async () => {
    const { user: editor, password: editorPass } = await seedUser(testApp.prisma, Role.EDITOR, {
      email: 'editor@example.test',
    });
    const { user: target } = await seedUser(testApp.prisma, Role.EDITOR, {
      email: 'target@example.test',
    });
    const { agent, csrfToken } = await loginAs(testApp.app, editor.email, editorPass);
    const res = await agent
      .patch(`/api/users/${target.id}/admin-reset-password`)
      .set('x-xsrf-token', csrfToken)
      .send({});
    expect(res.status).toBe(403);
  });

  it('writes an audit-log entry with action user.admin_password_reset_issued', async () => {
    const { user: admin, password: adminPass } = await seedUser(testApp.prisma, Role.ADMIN, {
      email: 'admin@example.test',
    });
    const { user: target } = await seedUser(testApp.prisma, Role.EDITOR, {
      email: 'target@example.test',
    });
    const { agent, csrfToken } = await loginAs(testApp.app, admin.email, adminPass);
    await agent
      .patch(`/api/users/${target.id}/admin-reset-password`)
      .set('x-xsrf-token', csrfToken)
      .send({});

    const entry = await testApp.prisma.auditLog.findFirst({
      where: { action: 'user.admin_password_reset_issued', entityId: target.id },
    });
    expect(entry).not.toBeNull();
    expect(entry!.performedBy).toBe(admin.id);
  });
});
