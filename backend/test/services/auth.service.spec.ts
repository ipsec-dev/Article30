import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { ConflictException, GoneException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import Redis from 'ioredis';
import { AuthService } from '../../src/modules/auth/auth.service';
import { PasswordResetTokenService } from '../../src/modules/auth/password-reset-token.service';
import { SessionService, REDIS_CLIENT } from '../../src/modules/auth/session.service';
import { MailService } from '../../src/modules/mail/mail.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { Role } from '@article30/shared';

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

const EMAIL_ALICE = 'alice@example.com';
const PASSWORD_PLAINTEXT = 'plaintext123';
const PASSWORD_SECRET = 'secret';
const EMAIL_BOB = 'bob@example.com';

describe('AuthService', () => {
  let module: TestingModule;
  let service: AuthService;
  let prisma: PrismaService;
  let redis: Redis;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.NODE_ENV = 'test';
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
            svc.setTransportForTesting(transport as unknown as nodemailer.Transporter, []);
            return svc;
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    prisma = module.get(PrismaService);
    // Defensive: signup() throws GoneException when userCount > 0 (bootstrap
    // gate), so a leftover user from a prior spec file would silently fail
    // the first signup test. afterEach cleans up after, beforeAll ensures we
    // start clean too.
    await cleanupDatabase(prisma);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await module.close();
    await redis.quit();
  });

  describe('signup()', () => {
    it('creates a user with a bcrypt-hashed password (not plaintext)', async () => {
      const result = await service.signup({
        firstName: 'Alice',
        lastName: 'Test',
        email: EMAIL_ALICE,
        password: PASSWORD_PLAINTEXT,
      });

      const dbUser = await prisma.user.findUnique({ where: { email: EMAIL_ALICE } });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.password).not.toBe(PASSWORD_PLAINTEXT);
      expect(dbUser?.password).toMatch(/^\$2[aby]\$/);
      const valid = await bcrypt.compare(PASSWORD_PLAINTEXT, dbUser?.password ?? '');
      expect(valid).toBe(true);

      expect(result).not.toHaveProperty('password');
    });

    it('first user is ADMIN and approved=true', async () => {
      const result = await service.signup({
        firstName: 'First',
        lastName: 'Admin',
        email: 'admin@example.com',
        password: PASSWORD_SECRET,
      });

      expect(result.role).toBe(Role.ADMIN);
      expect(result.approved).toBe(true);
    });

    it('throws GoneException with signup_closed after the first user exists', async () => {
      await service.signup({
        firstName: 'First',
        lastName: 'Admin',
        email: 'admin@example.com',
        password: PASSWORD_SECRET,
      });

      const err = await service
        .signup({
          email: 'second@example.test',
          firstName: 'Second',
          lastName: 'User',
          password: 'Strongpass12',
        })
        .catch(e => e);
      expect(err).toBeInstanceOf(GoneException);
      expect((err as GoneException).getResponse()).toEqual({ error: 'signup_closed' });
    });

    it('throws ConflictException for duplicate email', async () => {
      await service.signup({
        firstName: 'Alice',
        lastName: 'Test',
        email: EMAIL_ALICE,
        password: 'pass1',
      });

      await expect(
        service.signup({
          firstName: 'Alice',
          lastName: 'Again',
          email: EMAIL_ALICE,
          password: 'pass2',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login()', () => {
    it('returns user without password when credentials are valid', async () => {
      await service.signup({
        firstName: 'Bob',
        lastName: 'Test',
        email: EMAIL_BOB,
        password: 'correctpass',
      });

      const result = await service.login({
        email: EMAIL_BOB,
        password: 'correctpass',
      });

      expect(result).toBeDefined();
      expect(result.email).toBe(EMAIL_BOB);
      expect(result).not.toHaveProperty('password');
    });

    it('throws UnauthorizedException for wrong password', async () => {
      await service.signup({
        firstName: 'Carol',
        lastName: 'Test',
        email: 'carol@example.com',
        password: 'rightpass',
      });

      await expect(
        service.login({
          email: 'carol@example.com',
          password: 'wrongpass',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for unknown email', async () => {
      await expect(
        service.login({
          email: 'nobody@example.com',
          password: 'anypass',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
