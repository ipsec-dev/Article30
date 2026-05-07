import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Severity } from '@article30/shared';
import { RemediationService } from '../../src/modules/violations/remediation.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module';
import { MailService } from '../../src/modules/mail/mail.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 4;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe('Action item assigned notification', () => {
  let module: TestingModule;
  let svc: RemediationService;
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
      providers: [RemediationService, EntityValidator, TimelineService],
    })
      .overrideProvider(MailService)
      .useValue(mail)
      .compile();

    svc = module.get(RemediationService);
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
      data: { slug: `ai-${Date.now()}`, locale: 'fr', companyName: 'Acme' },
    });
  });

  async function seedUser(email: string) {
    return prisma.user.create({
      data: {
        firstName: 'Owen',
        lastName: 'Owner',
        email,
        password: await bcrypt.hash('x', BCRYPT_ROUNDS),
        role: 'EDITOR',
        approved: true,
      },
    });
  }

  async function seedViolation(createdBy: string) {
    return prisma.violation.create({
      data: {
        title: 'V',
        severity: Severity.LOW,
        awarenessAt: new Date(),
        createdBy,
      },
    });
  }

  it('emits action-item.assigned on create', async () => {
    const owner = await seedUser('owen@example.com');
    const v = await seedViolation(owner.id);
    await svc.create({
      violationId: v.id,
      title: 'Patch X',
      ownerId: owner.id,
      deadline: new Date(Date.now() + SEVEN_DAYS_MS),
    });

    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: owner.email, templateId: 'action-item-assigned' }),
    );
  });

  it('emits action-item.assigned on owner change', async () => {
    const owner1 = await seedUser('owen@example.com');
    const owner2 = await seedUser('two@example.com');
    const v = await seedViolation(owner1.id);
    const item = await svc.create({
      violationId: v.id,
      title: 'Patch X',
      ownerId: owner1.id,
      deadline: new Date(Date.now() + SEVEN_DAYS_MS),
    });
    mail.send.mockClear();

    await svc.update({ actionItemId: item.id, ownerId: owner2.id, updatedBy: owner1.id });

    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: owner2.email, templateId: 'action-item-assigned' }),
    );
  });

  it('does NOT emit on update when owner unchanged', async () => {
    const owner1 = await seedUser('owen@example.com');
    const v = await seedViolation(owner1.id);
    const item = await svc.create({
      violationId: v.id,
      title: 'Patch X',
      ownerId: owner1.id,
      deadline: new Date(Date.now() + SEVEN_DAYS_MS),
    });
    mail.send.mockClear();

    await svc.update({
      actionItemId: item.id,
      title: 'Patch X (renamed)',
      updatedBy: owner1.id,
    });

    expect(mail.send).not.toHaveBeenCalled();
  });

  it('emits on every owner change, even when ownership ping-pongs', async () => {
    const a = await seedUser('a@example.com');
    const b = await seedUser('b@example.com');
    const v = await seedViolation(a.id);
    const item = await svc.create({
      violationId: v.id,
      title: 'Patch',
      ownerId: a.id,
      deadline: new Date(Date.now() + SEVEN_DAYS_MS),
    });
    mail.send.mockClear();

    await svc.update({ actionItemId: item.id, ownerId: b.id, updatedBy: a.id }); // mail to B (1st)
    await svc.update({ actionItemId: item.id, ownerId: a.id, updatedBy: a.id }); // mail to A
    await svc.update({ actionItemId: item.id, ownerId: b.id, updatedBy: a.id }); // mail to B AGAIN

    expect(mail.send).toHaveBeenCalledTimes(3);
    const recipients = mail.send.mock.calls.map(c => (c[0] as { to: string }).to).sort();
    expect(recipients).toEqual(['a@example.com', 'b@example.com', 'b@example.com']);
  });

  it('passes the 5-block template context including the parent violation title', async () => {
    const owner = await seedUser('owen-ctx@example.com');
    const v = await prisma.violation.create({
      data: {
        title: 'Parent violation',
        severity: 'LOW',
        awarenessAt: new Date(),
        createdBy: owner.id,
      },
    });
    await svc.create({
      violationId: v.id,
      title: 'Patch the bucket policy',
      ownerId: owner.id,
      deadline: new Date(Date.now() + 7 * 86_400_000),
    });
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'action-item-assigned',
        context: expect.objectContaining({
          taskTitle: 'Patch the bucket policy',
          violationTitle: 'Parent violation',
          deadlineDate: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
          shortRef: expect.stringMatching(/^ACT-[a-f0-9]{8}$/),
          footerOrientation: expect.stringContaining('élément vous est assigné'),
        }),
      }),
    );
  });
});
