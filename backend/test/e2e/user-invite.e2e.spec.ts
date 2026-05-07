import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs, primeCsrf } from './login';
import { seedUser } from './seed';

describe('user-invite (e2e)', () => {
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

  it('full invite roundtrip: admin invites, target consumes URL, target logs in', async () => {
    const { user: admin, password: adminPass } = await seedUser(testApp.prisma, Role.ADMIN, {
      email: 'admin@example.test',
    });

    const { agent, csrfToken } = await loginAs(testApp.app, admin.email, adminPass);
    const res = await agent
      .post('/api/users')
      .set('x-xsrf-token', csrfToken)
      .send({ email: 'alice@example.test', role: Role.EDITOR });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: 'alice@example.test',
      role: Role.EDITOR,
    });
    expect(res.body.user.id).toBeTypeOf('string');
    expect(res.body.resetUrl).toMatch(
      /^https:\/\/app\.test\/reset-password\?token=[a-f0-9]{64}&invite=1$/,
    );
    expect(res.body.expiresInMinutes).toBe(60);

    // Target consumes the URL.
    const token = new URL(res.body.resetUrl).searchParams.get('token')!;
    const { agent: anon, csrfToken: anonCsrf } = await primeCsrf(testApp.app);
    const resetRes = await anon
      .post('/api/auth/reset-password')
      .set('x-xsrf-token', anonCsrf)
      .send({ token, firstName: 'Alice', lastName: 'Smith', newPassword: 'Invitedpass12' });
    expect(resetRes.status).toBe(201);

    // Target logs in with the password they just set.
    const { agent: inviteeAgent } = await loginAs(
      testApp.app,
      'alice@example.test',
      'Invitedpass12',
    );
    const me = await inviteeAgent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('alice@example.test');
    expect(me.body.role).toBe(Role.EDITOR);
  });

  it('returns 401 without a session', async () => {
    const { agent, csrfToken } = await primeCsrf(testApp.app);
    const res = await agent
      .post('/api/users')
      .set('x-xsrf-token', csrfToken)
      .send({ email: 'alice@example.test', role: Role.EDITOR });
    expect(res.status).toBe(401);
  });

  it('returns 403 when a non-admin attempts to invite', async () => {
    const { user: editor, password: editorPass } = await seedUser(testApp.prisma, Role.EDITOR, {
      email: 'editor@example.test',
    });
    const { agent, csrfToken } = await loginAs(testApp.app, editor.email, editorPass);
    const res = await agent
      .post('/api/users')
      .set('x-xsrf-token', csrfToken)
      .send({ email: 'alice@example.test', role: Role.EDITOR });
    expect(res.status).toBe(403);
  });

  it('returns 409 when inviting an email already on file', async () => {
    const { user: admin, password: adminPass } = await seedUser(testApp.prisma, Role.ADMIN, {
      email: 'admin@example.test',
    });
    await seedUser(testApp.prisma, Role.EDITOR, { email: 'duplicate@example.test' });

    const { agent, csrfToken } = await loginAs(testApp.app, admin.email, adminPass);
    const res = await agent
      .post('/api/users')
      .set('x-xsrf-token', csrfToken)
      .send({ email: 'duplicate@example.test', role: Role.EDITOR });
    expect(res.status).toBe(409);
  });

  it('writes an audit-log entry with action user.invited', async () => {
    const { user: admin, password: adminPass } = await seedUser(testApp.prisma, Role.ADMIN, {
      email: 'admin@example.test',
    });
    const { agent, csrfToken } = await loginAs(testApp.app, admin.email, adminPass);
    const res = await agent
      .post('/api/users')
      .set('x-xsrf-token', csrfToken)
      .send({ email: 'audit-target@example.test', role: Role.DPO });
    expect(res.status).toBe(201);
    const newUserId = res.body.user.id;

    const entry = await testApp.prisma.auditLog.findFirst({
      where: { action: 'user.invited', entityId: newUserId },
    });
    expect(entry).not.toBeNull();
    expect(entry!.performedBy).toBe(admin.id);
    expect(entry!.newValue).toMatchObject({
      email: 'audit-target@example.test',
      role: Role.DPO,
    });
  });
});
