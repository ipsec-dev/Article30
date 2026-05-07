import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { VendorAssessmentsService } from '../../src/modules/vendors/vendor-assessments.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module';
import { MailService } from '../../src/modules/mail/mail.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;

describe('Vendor questionnaire returned notification', () => {
  let module: TestingModule;
  let svc: VendorAssessmentsService;
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
      providers: [VendorAssessmentsService],
    })
      .overrideProvider(MailService)
      .useValue(mail)
      .compile();

    svc = module.get(VendorAssessmentsService);
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
        slug: `vend-test-${Date.now()}`,
        locale: 'fr',
        dpoEmail: 'dpo@example.com',
        dpoName: 'Diana DPO',
        companyName: 'Acme',
      },
    });
  });

  async function seedUser(email = `user-${Date.now()}@example.com`) {
    const hashedPassword = await bcrypt.hash('password', BCRYPT_ROUNDS);
    return prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email,
        password: hashedPassword,
        role: 'ADMIN',
        approved: true,
      },
    });
  }

  it('emits vendor.questionnaire-returned to dpoEmail when assessment is submitted', async () => {
    const user = await seedUser('vqr-creator@example.com');
    const vendor = await prisma.vendor.create({
      data: { name: 'Stripe', createdBy: user.id },
    });
    const assessment = await prisma.vendorAssessment.create({
      data: { vendorId: vendor.id, createdBy: user.id, status: 'IN_PROGRESS', answers: [] },
    });

    await svc.submit(assessment.id);

    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'dpo@example.com',
        templateId: 'vendor-questionnaire-returned',
        locale: 'fr',
        context: expect.objectContaining({
          recipientFirstName: 'Diana DPO',
          orgCompanyName: 'Acme',
          vendorName: 'Stripe',
          recordUrl: `https://app.test/vendors/${vendor.id}`,
        }),
      }),
    );

    const log = await prisma.notificationLog.findFirst({
      where: { kind: 'vendor.questionnaire-returned', recordId: vendor.id },
    });
    expect(log).not.toBeNull();
    expect(log?.recipientEmail).toBe('dpo@example.com');
    expect(log?.leadTime).toBe('INSTANT');
  });

  it('passes the 5-block template context', async () => {
    const seeder = await seedUser('seeder@example.test');
    const vendor = await prisma.vendor.create({
      data: { name: 'Stripe', createdBy: seeder.id },
    });
    const assessment = await prisma.vendorAssessment.create({
      data: { vendorId: vendor.id, status: 'IN_PROGRESS', createdBy: seeder.id, answers: [] },
    });
    await svc.submit(assessment.id);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'vendor-questionnaire-returned',
        context: expect.objectContaining({
          vendorName: 'Stripe',
          submittedDate: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
          shortRef: expect.stringMatching(/^VEN-[a-f0-9]{8}$/),
          orgCompanyName: 'Acme',
          footerOrientation: expect.stringContaining('DPO de Acme'),
        }),
      }),
    );
  });

  it('does NOT emit when SMTP is disabled', async () => {
    mail.isEnabled.mockReturnValue(false);
    const user = await seedUser('vqr-smtp-off@example.com');
    const vendor = await prisma.vendor.create({
      data: { name: 'Twilio', createdBy: user.id },
    });
    const assessment = await prisma.vendorAssessment.create({
      data: { vendorId: vendor.id, createdBy: user.id, status: 'PENDING', answers: [] },
    });

    await svc.submit(assessment.id);

    expect(mail.send).not.toHaveBeenCalled();
    const log = await prisma.notificationLog.findFirst({
      where: { kind: 'vendor.questionnaire-returned', recordId: vendor.id },
    });
    expect(log).toBeNull();
  });
});
