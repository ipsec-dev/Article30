import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { DsrType } from '@article30/shared';
import { DsrService } from '../../src/modules/dsr/dsr.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module';
import { MailService } from '../../src/modules/mail/mail.service';
import { DsrPauseService } from '../../src/modules/dsr/dsr-pause.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';
import { DecisionsService } from '../../src/modules/follow-up/decisions.service';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;

describe('DSR submitted notification', () => {
  let module: TestingModule;
  let dsrService: DsrService;
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
      providers: [DsrService, DsrPauseService, EntityValidator, DecisionsService, TimelineService],
    })
      .overrideProvider(MailService)
      .useValue(mail)
      .compile();

    dsrService = module.get(DsrService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    mail.send.mockClear();
    mail.isEnabled.mockReturnValue(true);
    await cleanupDatabase(prisma);
  });

  async function seedUser(overrides: { email?: string; firstName?: string } = {}) {
    const hashedPassword = await bcrypt.hash('password', BCRYPT_ROUNDS);
    return prisma.user.create({
      data: {
        firstName: overrides.firstName ?? 'Test',
        lastName: 'User',
        email: overrides.email ?? `user-${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'ADMIN',
        approved: true,
      },
    });
  }

  it('emits dsr.submitted to org DPO when no assignee', async () => {
    const creator = await seedUser({ email: 'creator@example.com' });
    await prisma.organization.create({
      data: {
        slug: `dsr-test-${Date.now()}`,
        locale: 'fr',
        dpoEmail: 'dpo@example.com',
        dpoName: 'Diana DPO',
        companyName: 'Acme',
      },
    });

    const dsr = await dsrService.create(
      {
        type: DsrType.ACCESS,
        requesterName: 'John Doe',
        requesterEmail: 'john@example.com',
      },
      creator.id,
    );

    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'dpo@example.com',
        templateId: 'dsr-submitted',
        locale: 'fr',
      }),
    );

    const log = await prisma.notificationLog.findFirst({
      where: { kind: 'dsr.submitted', recordId: dsr.id },
    });
    expect(log).not.toBeNull();
    expect(log?.recipientEmail).toBe('dpo@example.com');
    expect(log?.leadTime).toBe('INSTANT');
  });

  it('routes to the assignee email instead of the DPO when assignedTo is set', async () => {
    const creator = await seedUser({ email: 'creator2@example.com' });
    const assignee = await seedUser({
      email: 'assignee@example.com',
      firstName: 'Anna',
    });
    await prisma.organization.create({
      data: {
        slug: `dsr-test-${Date.now()}`,
        locale: 'en',
        dpoEmail: 'dpo@example.com',
        companyName: 'Acme',
      },
    });

    await dsrService.create(
      {
        type: DsrType.ERASURE,
        requesterName: 'Jane Roe',
        requesterEmail: 'jane@example.com',
        assignedTo: assignee.id,
      },
      creator.id,
    );

    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'assignee@example.com',
        templateId: 'dsr-submitted',
        locale: 'en',
        context: expect.objectContaining({
          recipientFirstName: 'Anna',
          requesterName: 'Jane Roe',
          recordUrl: expect.stringMatching(/^https:\/\/app\.test\/dsr\/[a-z0-9-]+$/),
        }),
      }),
    );
  });

  it('drops silently when there is no org DPO and no assignee', async () => {
    const creator = await seedUser({ email: 'creator3@example.com' });

    const dsr = await dsrService.create(
      {
        type: DsrType.ACCESS,
        requesterName: 'Solo Sam',
        requesterEmail: 'sam@example.com',
      },
      creator.id,
    );

    expect(mail.send).not.toHaveBeenCalled();
    const log = await prisma.notificationLog.findFirst({
      where: { kind: 'dsr.submitted', recordId: dsr.id },
    });
    expect(log).toBeNull();
  });

  it('passes the 5-block template context (shortRef, dsrTypeLabel, footerOrientation)', async () => {
    const creator = await seedUser({ email: 'creator-ctx@example.com' });
    await prisma.organization.create({
      data: {
        slug: `dsr-ctx-${Date.now()}`,
        locale: 'fr',
        dpoEmail: 'dpo@example.com',
        dpoName: 'Diane',
        companyName: 'Acme Demo',
      },
    });
    await dsrService.create(
      {
        type: DsrType.ACCESS,
        requesterName: 'Jane',
        requesterEmail: 'jane@example.com',
      },
      creator.id,
    );
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'dsr-submitted',
        context: expect.objectContaining({
          dsrTypeLabel: "Demande d'accès (Art. 15 RGPD)",
          requesterEmail: 'jane@example.com',
          receivedDate: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
          deadlineDate: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
          leadTimeLabel: expect.stringMatching(/jour/),
          shortRef: expect.stringMatching(/^DSR-[a-f0-9]{8}$/),
          orgCompanyName: 'Acme Demo',
          footerOrientation: 'Vous recevez cet e-mail en tant que DPO de Acme Demo.',
          settingsUrl: 'https://app.test/settings#notifications',
        }),
      }),
    );
  });

  it('skips sending when SMTP is disabled', async () => {
    mail.isEnabled.mockReturnValue(false);
    const creator = await seedUser({ email: 'creator4@example.com' });
    await prisma.organization.create({
      data: {
        slug: `dsr-test-${Date.now()}`,
        locale: 'fr',
        dpoEmail: 'dpo@example.com',
        companyName: 'Acme',
      },
    });

    const dsr = await dsrService.create(
      {
        type: DsrType.ACCESS,
        requesterName: 'John Doe',
        requesterEmail: 'john@example.com',
      },
      creator.id,
    );

    expect(mail.send).not.toHaveBeenCalled();
    const log = await prisma.notificationLog.findFirst({
      where: { kind: 'dsr.submitted', recordId: dsr.id },
    });
    expect(log).toBeNull();
  });
});
