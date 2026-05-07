import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Role } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs, primeCsrf } from './login';
import { seedUser } from './seed';
import { MailService } from '../../src/modules/mail/mail.service';

describe('auth.controller (e2e)', () => {
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
    // leak across tests sharing one source IP (the 3/60s signup cap and
    // 5/60s login cap would otherwise trip during a full suite run).
    const throttlerStorage = testApp.app.get<{ storage?: Map<string, unknown> }>(ThrottlerStorage, {
      strict: false,
    });
    throttlerStorage?.storage?.clear();
    testApp.mailSink.length = 0;
  });

  describe('POST /api/auth/signup', () => {
    it('creates the first user as ADMIN and returns 201', async () => {
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent.post('/api/auth/signup').set('x-xsrf-token', csrfToken).send({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.test',
        password: 'Strongpass12',
      });
      expect(res.status).toBe(201);
      expect(res.body.role).toBe(Role.ADMIN);
      expect(res.body.email).toBe('alice@example.test');
      expect(res.body.password).toBeUndefined();
    });

    it('rejects a duplicate email with 409', async () => {
      const first = await primeCsrf(testApp.app);
      const firstRes = await first.agent
        .post('/api/auth/signup')
        .set('x-xsrf-token', first.csrfToken)
        .send({
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.test',
          password: 'Strongpass12',
        });
      expect(firstRes.status).toBe(201);
      const second = await primeCsrf(testApp.app);
      const res = await second.agent
        .post('/api/auth/signup')
        .set('x-xsrf-token', second.csrfToken)
        .send({
          firstName: 'Alice',
          lastName: 'Two',
          email: 'alice@example.test',
          password: 'Strongpass12',
        });
      expect(res.status).toBe(409);
    });

    it('rejects a weak password with 400', async () => {
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent.post('/api/auth/signup').set('x-xsrf-token', csrfToken).send({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.test',
        password: 'short',
      });
      expect(res.status).toBe(400);
    });

    it('returns 410 Gone with { error: "signup_closed" } after the first user exists', async () => {
      // Seed one user so the DB is no longer empty.
      await seedUser(testApp.prisma, Role.ADMIN, { email: 'bootstrap@example.test' });

      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent.post('/api/auth/signup').set('x-xsrf-token', csrfToken).send({
        email: 'second@example.test',
        firstName: 'Second',
        lastName: 'User',
        password: 'Strongpass12',
      });
      expect(res.status).toBe(410);
      expect(res.body).toMatchObject({ error: 'signup_closed' });
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 201 and sets a session cookie on valid credentials', async () => {
      await seedUser(testApp.prisma, Role.ADMIN, {
        email: 'alice@example.test',
        password: 'Strongpass12',
      });
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent
        .post('/api/auth/login')
        .set('x-xsrf-token', csrfToken)
        .send({ email: 'alice@example.test', password: 'Strongpass12' });
      expect(res.status).toBe(201);
      const setCookies = res.headers['set-cookie'];
      const cookies = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
      expect(cookies.some(c => c.startsWith('connect.sid='))).toBe(true);
    });

    it('returns 401 on wrong password', async () => {
      await seedUser(testApp.prisma, Role.ADMIN, {
        email: 'alice@example.test',
        password: 'Strongpass12',
      });
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent
        .post('/api/auth/login')
        .set('x-xsrf-token', csrfToken)
        .send({ email: 'alice@example.test', password: 'WrongStrongpass99' });
      expect(res.status).toBe(401);
    });

    it('returns 401 on unknown email', async () => {
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent
        .post('/api/auth/login')
        .set('x-xsrf-token', csrfToken)
        .send({ email: 'nobody@example.test', password: 'Strongpass12' });
      expect(res.status).toBe(401);
    });

    it('login response sets a fresh XSRF-TOKEN cookie matching the post-regenerate session', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.ADMIN, {
        email: 'csrf-regen@example.test',
        password: 'Strongpass12',
      });
      const { agent, csrfToken: preLoginToken } = await primeCsrf(testApp.app);
      const res = await agent
        .post('/api/auth/login')
        .set('x-xsrf-token', preLoginToken)
        .send({ email: user.email, password });
      expect(res.status).toBe(201);
      const setCookie = res.headers['set-cookie'];
      const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
      // The response contains two XSRF-TOKEN set-cookie headers: the first is
      // set by csrfMiddleware (old pre-regenerate value), the second is set by
      // the login controller's regenerate callback (fresh post-regenerate value).
      // We want the last one — the fresh token that the browser will store.
      const xsrf = [...cookies].reverse().find((c: string) => c.startsWith('XSRF-TOKEN='));
      expect(xsrf).toBeDefined();
      const match = /XSRF-TOKEN=([^;]+)/.exec(xsrf!);
      const postLoginToken = match ? decodeURIComponent(match[1]) : null;
      expect(postLoginToken).toBeTruthy();
      expect(postLoginToken).not.toBe(preLoginToken);
      // Prove the rotated token is valid: the authenticated session is accessible.
      const meRes = await agent.get('/api/auth/me').set('x-xsrf-token', postLoginToken!);
      expect(meRes.status).toBe(200);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without a session', async () => {
      const res = await testApp.agent().get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns the current user when logged in', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent } = await loginAs(testApp.app, user.email, password);
      const res = await agent.get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(user.email);
      expect(res.body.role).toBe(Role.DPO);
      expect(res.body.password).toBeUndefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns 201 and clears the session', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent.post('/api/auth/logout').set('x-xsrf-token', csrfToken);
      expect(res.status).toBe(201);
      const me = await agent.get('/api/auth/me');
      expect(me.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('returns 201 and enqueues a mail for an approved user', async () => {
      const { user } = await seedUser(testApp.prisma, Role.DPO, { email: 'bob@example.test' });
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent
        .post('/api/auth/forgot-password')
        .set('x-xsrf-token', csrfToken)
        .send({ email: user.email });
      expect(res.status).toBe(201);
      expect(testApp.mailSink).toHaveLength(1);
      expect(testApp.mailSink[0].to).toBe(user.email);
    });

    it('returns 201 but sends no mail for an unknown email', async () => {
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent
        .post('/api/auth/forgot-password')
        .set('x-xsrf-token', csrfToken)
        .send({ email: 'nobody@example.test' });
      expect(res.status).toBe(201);
      expect(testApp.mailSink).toHaveLength(0);
    });

    it('returns 410 Gone with { error: "smtp_disabled" } when SMTP_ENABLED=false', async () => {
      const original = process.env.SMTP_ENABLED;
      process.env.SMTP_ENABLED = 'false';
      const mailService = testApp.app.get(MailService);
      mailService.setDisabledForTesting();
      try {
        const { agent, csrfToken } = await primeCsrf(testApp.app);
        const res = await agent
          .post('/api/auth/forgot-password')
          .set('x-xsrf-token', csrfToken)
          .send({ email: 'anyone@example.test' });
        expect(res.status).toBe(410);
        expect(res.body).toMatchObject({ error: 'smtp_disabled' });
      } finally {
        process.env.SMTP_ENABLED = original;
        // Re-prime the live transport for subsequent tests in the file.
        const transport = (await import('nodemailer')).createTransport({ jsonTransport: true });
        mailService.setTransportForTesting(
          transport as unknown as import('nodemailer').Transporter,
          testApp.mailSink,
        );
      }
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('returns 401 without a session', async () => {
      const { agent, csrfToken } = await primeCsrf(testApp.app);
      const res = await agent
        .post('/api/auth/change-password')
        .set('x-xsrf-token', csrfToken)
        .send({ currentPassword: 'Strongpass12', newPassword: 'NewStrongpass34' });
      expect(res.status).toBe(401);
    });

    it('updates password and returns 201 when current is correct', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/auth/change-password')
        .set('x-xsrf-token', csrfToken)
        .send({ currentPassword: password, newPassword: 'NewStrongpass34' });
      expect(res.status).toBe(201);
    });

    it('returns 401 when currentPassword is wrong', async () => {
      const { user, password } = await seedUser(testApp.prisma, Role.DPO);
      const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
      const res = await agent
        .post('/api/auth/change-password')
        .set('x-xsrf-token', csrfToken)
        .send({ currentPassword: 'WrongStrongpass99', newPassword: 'NewStrongpass34' });
      expect(res.status).toBe(401);
    });
  });
});
