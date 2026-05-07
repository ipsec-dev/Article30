import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { MailService } from '../../src/modules/mail/mail.service';
import { Role } from '@article30/shared';
import { seedUser } from './seed';
import backendPkg from '../../package.json';

describe('config.controller (e2e)', () => {
  let testApp: TestApp;
  const originalEnabled = process.env.SMTP_ENABLED;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await cleanupDatabase(testApp.prisma);
    await testApp.close();
    process.env.SMTP_ENABLED = originalEnabled;
  });

  afterEach(() => {
    testApp.mailSink.length = 0;
  });

  it('returns { smtpEnabled: true } without a session when SMTP is enabled', async () => {
    const res = await testApp.agent().get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ smtpEnabled: true });
  });

  it('returns { smtpEnabled: false } when MailService reports disabled', async () => {
    const mail = testApp.app.get(MailService);
    mail.setDisabledForTesting();
    const res = await testApp.agent().get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ smtpEnabled: false });
  });

  it('returns bootstrapAvailable: true when no users exist', async () => {
    await cleanupDatabase(testApp.prisma);
    const res = await testApp.agent().get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.bootstrapAvailable).toBe(true);
  });

  it('returns bootstrapAvailable: false once any user exists', async () => {
    await cleanupDatabase(testApp.prisma);
    await seedUser(testApp.prisma, Role.ADMIN, { email: 'bootstrap@example.test' });
    const res = await testApp.agent().get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.bootstrapAvailable).toBe(false);
  });

  it('includes the backend version in the response', async () => {
    const res = await testApp.agent().get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(backendPkg.version);
    expect(res.body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
