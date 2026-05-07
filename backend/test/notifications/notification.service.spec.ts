import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../../src/modules/notifications/notification.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { MailService } from '../../src/modules/mail/mail.service';

describe('NotificationService', () => {
  let module: TestingModule;
  let svc: NotificationService;
  let prisma: PrismaService;
  let mail: { send: ReturnType<typeof vi.fn>; isEnabled: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL_TEST ??
      'postgresql://article30:article30_secret@localhost:5432/article30_test';
    process.env.FRONTEND_URL = 'https://app.test';
    mail = { send: vi.fn().mockResolvedValue(undefined), isEnabled: vi.fn().mockReturnValue(true) };
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [NotificationService, { provide: MailService, useValue: mail }],
    }).compile();
    svc = module.get(NotificationService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    mail.send.mockClear();
    mail.isEnabled.mockReturnValue(true);
    await prisma.notificationLog.deleteMany();
  });

  it('uses the assignee email when set', async () => {
    await svc.notify({
      kind: 'dsr.submitted',
      recordId: 'r1',
      assigneeEmail: 'alice@example.com',
      orgDpoEmail: 'dpo@example.com',
      orgLocale: 'fr',
      context: { recordTitle: 't', recipientFirstName: 'A' },
    });
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'alice@example.com' }));
  });

  it('falls back to org DPO when no assignee', async () => {
    await svc.notify({
      kind: 'dsr.submitted',
      recordId: 'r2',
      assigneeEmail: null,
      orgDpoEmail: 'dpo@example.com',
      orgLocale: 'fr',
      context: { recordTitle: 't', recipientFirstName: 'D' },
    });
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'dpo@example.com' }));
  });

  it('drops silently when neither assignee nor dpo', async () => {
    await svc.notify({
      kind: 'dsr.submitted',
      recordId: 'r3',
      assigneeEmail: null,
      orgDpoEmail: null,
      orgLocale: 'fr',
      context: { recordTitle: 't', recipientFirstName: '' },
    });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('skips when SMTP is disabled and writes no log row', async () => {
    mail.isEnabled.mockReturnValue(false);
    await svc.notify({
      kind: 'dsr.submitted',
      recordId: 'r4',
      assigneeEmail: 'a@example.com',
      orgDpoEmail: null,
      orgLocale: 'fr',
      context: { recordTitle: 't', recipientFirstName: 'A' },
    });
    expect(mail.send).not.toHaveBeenCalled();
    const rows = await prisma.notificationLog.findMany({ where: { recordId: 'r4' } });
    expect(rows).toHaveLength(0);
  });

  it('respects the per-org settings toggle for scheduled kinds', async () => {
    await svc.notify({
      kind: 'dsr.deadline-approaching',
      recordId: 'r5',
      leadTime: 'T-7',
      assigneeEmail: 'a@example.com',
      orgDpoEmail: null,
      orgLocale: 'fr',
      context: { recordTitle: 't', recipientFirstName: 'A', leadTimeLabel: '7 jours' },
      settings: { notifyDsrDeadline: false },
    });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('always sends instant kinds regardless of settings', async () => {
    await svc.notify({
      kind: 'dsr.submitted',
      recordId: 'r6',
      assigneeEmail: 'a@example.com',
      orgDpoEmail: null,
      orgLocale: 'fr',
      context: { recordTitle: 't', recipientFirstName: 'A' },
      settings: { notifyDsrDeadline: false }, // shouldn't matter
    });
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — second call for same (kind, recordId, leadTime) is a no-op', async () => {
    const args = {
      kind: 'dsr.deadline-approaching' as const,
      recordId: 'r7',
      leadTime: 'T-1',
      assigneeEmail: 'a@example.com',
      orgDpoEmail: null,
      orgLocale: 'fr',
      context: { recordTitle: 't', recipientFirstName: 'A', leadTimeLabel: '1 jour' },
    };
    await svc.notify(args);
    await svc.notify(args);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('writes a notification_log row on success', async () => {
    await svc.notify({
      kind: 'dsr.submitted',
      recordId: 'r8',
      assigneeEmail: 'a@example.com',
      orgDpoEmail: null,
      orgLocale: 'fr',
      context: { recordTitle: 't', recipientFirstName: 'A' },
    });
    const rows = await prisma.notificationLog.findMany({ where: { recordId: 'r8' } });
    expect(rows).toHaveLength(1);
    expect(rows[0].leadTime).toBe('INSTANT');
    expect(rows[0].recipientEmail).toBe('a@example.com');
  });

  it('routes locale through resolveRecipientLocale', async () => {
    await svc.notify({
      kind: 'dsr.submitted',
      recordId: 'r9',
      assigneeEmail: 'a@example.com',
      orgDpoEmail: null,
      orgLocale: 'en',
      context: { recordTitle: 't', recipientFirstName: 'A' },
    });
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ locale: 'en' }));
  });

  it('builds footerOrientation + settingsUrl from recipientRole + orgCompanyName', async () => {
    await svc.notify({
      kind: 'dsr.submitted',
      recordId: 'role-1',
      assigneeEmail: null,
      orgDpoEmail: 'dpo@example.com',
      orgLocale: 'fr',
      orgCompanyName: 'Acme Demo',
      recipientRole: 'dpo',
      context: { recordTitle: 't', recipientFirstName: 'D' },
    });
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          footerOrientation: 'Vous recevez cet e-mail en tant que DPO de Acme Demo.',
          settingsUrl: 'https://app.test/settings#notifications',
          orgCompanyName: 'Acme Demo',
        }),
      }),
    );
  });

  it('uses the assignee-variant footer when recipientRole=assignee', async () => {
    await svc.notify({
      kind: 'dsr.submitted',
      recordId: 'role-2',
      assigneeEmail: 'a@example.com',
      orgDpoEmail: 'dpo@example.com',
      orgLocale: 'fr',
      orgCompanyName: 'Acme Demo',
      recipientRole: 'assignee',
      context: { recordTitle: 't', recipientFirstName: 'A' },
    });
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          footerOrientation: 'Vous recevez cet e-mail car cet élément vous est assigné.',
        }),
      }),
    );
  });
});
