import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Severity } from '@article30/shared';
import { ViolationsService } from '../../src/modules/violations/violations.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module';
import { MailService } from '../../src/modules/mail/mail.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';
import { DecisionsService } from '../../src/modules/follow-up/decisions.service';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { BreachNotificationsService } from '../../src/modules/violations/breach-notifications.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const DISCOVERED_AT = '2026-04-15T10:00:00.000Z';

describe('Violation logged notification', () => {
  let module: TestingModule;
  let svc: ViolationsService;
  let prisma: PrismaService;
  const mail = {
    send: vi.fn().mockResolvedValue(undefined),
    isEnabled: vi.fn().mockReturnValue(true),
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.FRONTEND_URL = 'https://app.test';
    module = await Test.createTestingModule({
      imports: [PrismaModule, NotificationsModule],
      providers: [
        ViolationsService,
        EntityValidator,
        DecisionsService,
        TimelineService,
        BreachNotificationsService,
      ],
    })
      .overrideProvider(MailService)
      .useValue(mail)
      .compile();

    svc = module.get(ViolationsService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    mail.send.mockClear();
    mail.isEnabled.mockReturnValue(true);
    await cleanupDatabase(prisma);
    await prisma.organization.create({
      data: {
        slug: `viol-test-${Date.now()}`,
        locale: 'fr',
        dpoEmail: 'dpo@example.com',
        dpoName: 'Diana DPO',
        companyName: 'Acme',
      },
    });
  });

  async function seedUser(overrides: { email?: string } = {}) {
    const hashedPassword = await bcrypt.hash('password', BCRYPT_ROUNDS);
    return prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: overrides.email ?? `user-${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'ADMIN',
        approved: true,
      },
    });
  }

  it('emits violation.logged for a LOW severity violation', async () => {
    const creator = await seedUser({ email: 'creator-low@example.com' });

    const v = await svc.create(
      { title: 'Test', severity: Severity.LOW, discoveredAt: DISCOVERED_AT },
      creator.id,
    );

    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'violation-logged', to: 'dpo@example.com' }),
    );
    const log = await prisma.notificationLog.findFirst({ where: { recordId: v.id } });
    expect(log?.kind).toBe('violation.logged');
  });

  it('emits both violation.logged AND violation.high-severity-72h-kickoff for HIGH', async () => {
    const creator = await seedUser({ email: 'creator-high@example.com' });

    const v = await svc.create(
      { title: 'Big', severity: Severity.HIGH, discoveredAt: DISCOVERED_AT },
      creator.id,
    );

    expect(mail.send).toHaveBeenCalledTimes(2);
    const calls = mail.send.mock.calls.map(c => (c[0] as { templateId: string }).templateId).sort();
    expect(calls).toEqual(['violation-72h-kickoff', 'violation-logged']);
    const logs = await prisma.notificationLog.findMany({ where: { recordId: v.id } });
    expect(logs.map(l => l.kind).sort()).toEqual([
      'violation.high-severity-72h-kickoff',
      'violation.logged',
    ]);
  });

  it('emits both for CRITICAL too', async () => {
    const creator = await seedUser({ email: 'creator-crit@example.com' });

    const v = await svc.create(
      { title: 'Crit', severity: Severity.CRITICAL, discoveredAt: DISCOVERED_AT },
      creator.id,
    );

    expect(mail.send).toHaveBeenCalledTimes(2);
    const logs = await prisma.notificationLog.findMany({ where: { recordId: v.id } });
    expect(logs.map(l => l.kind).sort()).toEqual([
      'violation.high-severity-72h-kickoff',
      'violation.logged',
    ]);
  });

  it('does NOT emit kickoff for MEDIUM', async () => {
    const creator = await seedUser({ email: 'creator-med@example.com' });

    await svc.create(
      { title: 'Med', severity: Severity.MEDIUM, discoveredAt: DISCOVERED_AT },
      creator.id,
    );

    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'violation-logged' }),
    );
  });

  it('passes the 5-block template context for violation.logged + kickoff', async () => {
    const creator = await seedUser({ email: 'creator-ctx@example.com' });
    const v = await svc.create(
      {
        title: 'Demo violation',
        severity: Severity.HIGH,
        discoveredAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
      creator.id,
    );
    expect(mail.send).toHaveBeenCalledTimes(2);
    const loggedCall = mail.send.mock.calls.find(
      c => (c[0] as { templateId: string }).templateId === 'violation-logged',
    );
    expect((loggedCall![0] as { context: Record<string, string> }).context).toEqual(
      expect.objectContaining({
        severityLabel: 'Élevée',
        discoveredDate: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
        categoriesLabel: expect.any(String),
        shortRef: expect.stringMatching(/^VIO-[a-f0-9]{8}$/),
        orgCompanyName: 'Acme',
        footerOrientation: expect.stringContaining('DPO de Acme'),
      }),
    );
    const kickoffCall = mail.send.mock.calls.find(
      c => (c[0] as { templateId: string }).templateId === 'violation-72h-kickoff',
    );
    expect((kickoffCall![0] as { context: Record<string, string> }).context).toEqual(
      expect.objectContaining({
        severityLabel: 'Élevée',
        awarenessDate: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
        cnilDeadlineDate: expect.stringMatching(/heure de Paris/),
        leadTimeLabel: expect.stringMatching(/h/),
        shortRef: expect.stringMatching(/^VIO-[a-f0-9]{8}$/),
      }),
    );
    expect(v.id).toBeDefined();
  });
});
