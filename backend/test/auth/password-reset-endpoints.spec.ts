import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Role } from '@article30/shared';
import { AuthService } from '../../src/modules/auth/auth.service';
import { PasswordResetTokenService } from '../../src/modules/auth/password-reset-token.service';
import { SessionService, REDIS_CLIENT } from '../../src/modules/auth/session.service';
import { MailService } from '../../src/modules/mail/mail.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR
const TEST_REDIS_BASE_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

function resolveRedisUrl(): string {
  const password = process.env.REDIS_PASSWORD;
  if (!password) return TEST_REDIS_BASE_URL;
  const parsed = new URL(TEST_REDIS_BASE_URL);
  if (parsed.username || parsed.password) return TEST_REDIS_BASE_URL;
  parsed.password = password;
  return parsed.toString();
}

describe('Password reset endpoints', () => {
  let module: TestingModule;
  let authService: AuthService;
  let prisma: PrismaService;
  let redis: Redis;
  let mailSink: Array<{ to: string; subject: string; text: string }>;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.NODE_ENV = 'test';
    process.env.SMTP_FROM = 'test@example.local';
    process.env.FRONTEND_URL = 'https://app.test';

    mailSink = [];
    redis = new Redis(resolveRedisUrl());

    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        AuthService,
        PasswordResetTokenService,
        SessionService,
        {
          provide: REDIS_CLIENT,
          useValue: redis,
        },
        {
          provide: MailService,
          useFactory: () => {
            const transport = nodemailer.createTransport({ jsonTransport: true });
            const svc = new MailService();
            svc.setTransportForTesting(transport as unknown as nodemailer.Transporter, mailSink);
            return svc;
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
    await redis.quit();
  });

  beforeEach(() => {
    mailSink.length = 0;
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
    const keys = await redis.keys('sess:*');
    if (keys.length > 0) await redis.del(...keys);
  });

  async function seedApprovedUser(email: string, password = 'Strongpass12'): Promise<string> {
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: '',
        email,
        password: await bcrypt.hash(password, 10),
        role: Role.AUDITOR,
        approved: true,
      },
    });
    return user.id;
  }

  describe('forgotPassword()', () => {
    it('creates a token and sends mail for an approved user', async () => {
      const uid = await seedApprovedUser('alice@example.com');
      await authService.forgotPassword({ email: 'alice@example.com' }, 'en-US');
      const rows = await prisma.passwordResetToken.findMany({ where: { userId: uid } });
      expect(rows).toHaveLength(1);
      expect(mailSink).toHaveLength(1);
      expect(mailSink[0].to).toBe('alice@example.com');
      expect(mailSink[0].subject).toBe('Reset your Article30 password');
      expect(mailSink[0].text).toContain('https://app.test/reset-password?token=');
    });

    it('sends the French template when Accept-Language is fr', async () => {
      await seedApprovedUser('bob@example.com');
      await authService.forgotPassword({ email: 'bob@example.com' }, 'fr-FR');
      expect(mailSink[0].subject).toBe('Réinitialisation de votre mot de passe Article30');
    });

    it('does nothing for a nonexistent email — no row, no mail', async () => {
      await authService.forgotPassword({ email: 'nobody@example.com' }, 'en');
      expect(await prisma.passwordResetToken.count()).toBe(0);
      expect(mailSink).toHaveLength(0);
    });

    it('does nothing for an unapproved user', async () => {
      await prisma.user.create({
        data: {
          firstName: 'Unapproved',
          lastName: '',
          email: 'pending@example.com',
          password: await bcrypt.hash('Strongpass12', 10),
          role: Role.AUDITOR,
          approved: false,
        },
      });
      await authService.forgotPassword({ email: 'pending@example.com' }, 'en');
      expect(await prisma.passwordResetToken.count()).toBe(0);
      expect(mailSink).toHaveLength(0);
    });
  });

  describe('resetPassword()', () => {
    it('updates password, marks token used, kills sessions, returns ok', async () => {
      const uid = await seedApprovedUser('carol@example.com');
      await redis.set(`sess:old1`, JSON.stringify({ userId: uid, cookie: {} }));
      await redis.set(`sess:other`, JSON.stringify({ userId: 'someone-else', cookie: {} }));

      await authService.forgotPassword({ email: 'carol@example.com' }, 'en');
      const match = mailSink[0].text.match(/token=([0-9a-f]{64})/);
      expect(match).not.toBeNull();
      const token = match![1];

      await authService.resetPassword(
        {
          token,
          firstName: 'Carol',
          lastName: 'Test',
          newPassword: 'Brandnewpass1',
        },
        'en',
      );

      const updated = await prisma.user.findUnique({ where: { id: uid } });
      const ok = await bcrypt.compare('Brandnewpass1', updated!.password);
      expect(ok).toBe(true);

      const row = await prisma.passwordResetToken.findFirst({ where: { userId: uid } });
      expect(row!.usedAt).not.toBeNull();

      expect(await redis.exists('sess:old1')).toBe(0);
      expect(await redis.exists('sess:other')).toBe(1);

      expect(mailSink).toHaveLength(2);
      expect(mailSink[1].subject).toBe('Your Article30 password was changed');
    });

    it('sends the FR password-changed mail when locale=fr', async () => {
      await seedApprovedUser('jules@example.com');
      await authService.forgotPassword({ email: 'jules@example.com' }, 'fr-FR');
      const token = mailSink[0].text.match(/token=([0-9a-f]{64})/)![1];

      await authService.resetPassword({ token, newPassword: 'Brandnewpass1' }, 'fr-FR');

      // Without the locale fix, the confirmation always rendered as EN
      // because the service hardcoded resolveLocale(undefined).
      expect(mailSink).toHaveLength(2);
      expect(mailSink[1].subject).toBe('Votre mot de passe Article30 a été modifié');
    });

    it('rejects an expired token', async () => {
      const uid = await seedApprovedUser('dana@example.com');
      await authService.forgotPassword({ email: 'dana@example.com' }, 'en');
      const token = mailSink[0].text.match(/token=([0-9a-f]{64})/)![1];
      await prisma.passwordResetToken.updateMany({
        where: { userId: uid },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await expect(
        authService.resetPassword(
          {
            token,
            firstName: 'Dana',
            lastName: 'Test',
            newPassword: 'Brandnewpass1',
          },
          'en',
        ),
      ).rejects.toThrow('invalid or expired token');
    });

    it('rejects an already-used token', async () => {
      await seedApprovedUser('eve@example.com');
      await authService.forgotPassword({ email: 'eve@example.com' }, 'en');
      const token = mailSink[0].text.match(/token=([0-9a-f]{64})/)![1];
      await authService.resetPassword(
        {
          token,
          firstName: 'Eve',
          lastName: 'Test',
          newPassword: 'Brandnewpass1',
        },
        'en',
      );
      await expect(
        authService.resetPassword(
          {
            token,
            firstName: 'Eve',
            lastName: 'Test',
            newPassword: 'Anotherpass1',
          },
          'en',
        ),
      ).rejects.toThrow('invalid or expired token');
    });

    it('rejects an unknown token', async () => {
      await expect(
        authService.resetPassword(
          {
            token: '0'.repeat(64),
            firstName: 'No',
            lastName: 'One',
            newPassword: 'Brandnewpass1',
          },
          'en',
        ),
      ).rejects.toThrow('invalid or expired token');
    });

    it('flips user.approved and persists firstName/lastName for an invitee', async () => {
      // Simulate an invitee: created with approved=false, no usable password,
      // and placeholder names that the invitee fills in on the reset page.
      const user = await prisma.user.create({
        data: {
          email: 'pending@x.com',
          firstName: 'P',
          lastName: '',
          role: Role.EDITOR,
          password: await bcrypt.hash('disabled', 10),
          approved: false,
        },
      });
      // Invitees can't go through forgotPassword (it short-circuits on approved=false),
      // so generate the reset token directly via the token service.
      const tokens = module.get(PasswordResetTokenService);
      const token = await tokens.generate(user.id);

      await authService.resetPassword(
        {
          token,
          firstName: 'Invited',
          lastName: 'User',
          newPassword: 'StrongPass1!',
        },
        'en',
      );

      const after = await prisma.user.findUnique({ where: { id: user.id } });
      expect(after?.approved).toBe(true);
      expect(after?.firstName).toBe('Invited');
      expect(after?.lastName).toBe('User');
    });

    it('leaves firstName/lastName untouched when names are omitted (admin-issued reset)', async () => {
      const uid = await seedApprovedUser('ivan@example.com');
      // Override the default seed so we can assert the existing names are preserved.
      await prisma.user.update({
        where: { id: uid },
        data: { firstName: 'Ivan', lastName: 'Original' },
      });

      await authService.forgotPassword({ email: 'ivan@example.com' }, 'en');
      const token = mailSink[0].text.match(/token=([0-9a-f]{64})/)![1];

      await authService.resetPassword(
        {
          token,
          newPassword: 'Brandnewpass1',
        },
        'en',
      );

      const after = await prisma.user.findUnique({ where: { id: uid } });
      expect(after?.firstName).toBe('Ivan');
      expect(after?.lastName).toBe('Original');
    });
  });

  describe('changePassword()', () => {
    it('updates password, keeps current session, kills other sessions, sends mail', async () => {
      const uid = await seedApprovedUser('frank@example.com', 'Currentpass1');
      const currentSessionId = 'current-xyz';
      await redis.set(`sess:${currentSessionId}`, JSON.stringify({ userId: uid, cookie: {} }));
      await redis.set(`sess:other1`, JSON.stringify({ userId: uid, cookie: {} }));
      await redis.set(`sess:elsewhere`, JSON.stringify({ userId: 'other-user', cookie: {} }));

      await authService.changePassword(
        uid,
        currentSessionId,
        { currentPassword: 'Currentpass1', newPassword: 'Brandnewpass2' },
        'en',
      );

      const updated = await prisma.user.findUnique({ where: { id: uid } });
      expect(await bcrypt.compare('Brandnewpass2', updated!.password)).toBe(true);

      expect(await redis.exists(`sess:${currentSessionId}`)).toBe(1);
      expect(await redis.exists('sess:other1')).toBe(0);
      expect(await redis.exists('sess:elsewhere')).toBe(1);

      expect(mailSink).toHaveLength(1);
      expect(mailSink[0].subject).toBe('Your Article30 password was changed');
    });

    it('rejects with 401 on wrong current password', async () => {
      const uid = await seedApprovedUser('grace@example.com', 'Currentpass1');
      await expect(
        authService.changePassword(
          uid,
          'sid',
          { currentPassword: 'Wrongpass1', newPassword: 'Brandnewpass2' },
          'en',
        ),
      ).rejects.toThrow();
    });

    it('rejects when new === current', async () => {
      const uid = await seedApprovedUser('henry@example.com', 'Samepass1');
      await expect(
        authService.changePassword(
          uid,
          'sid',
          { currentPassword: 'Samepass1', newPassword: 'Samepass1' },
          'en',
        ),
      ).rejects.toThrow('new password must differ from current');
    });
  });
});
