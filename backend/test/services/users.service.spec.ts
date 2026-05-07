import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Role } from '@article30/shared';
import { UsersService } from '../../src/modules/users/users.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PasswordResetTokenService } from '../../src/modules/auth/password-reset-token.service';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { MailService } from '../../src/modules/mail/mail.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;

describe('UsersService', () => {
  let module: TestingModule;
  let service: UsersService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        UsersService,
        {
          provide: PasswordResetTokenService,
          useValue: { generate: vi.fn().mockResolvedValue('stub-token') },
        },
        {
          provide: AuditLogService,
          useValue: { create: vi.fn().mockResolvedValue(undefined) },
        },
        {
          provide: MailService,
          useValue: { isEnabled: vi.fn().mockReturnValue(false), send: vi.fn() },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await module.close();
  });

  async function seedUser(overrides: { email?: string; role?: Role; approved?: boolean } = {}) {
    const hashedPassword = await bcrypt.hash('password', BCRYPT_ROUNDS);
    return prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: overrides.email ?? 'user@example.com',
        password: hashedPassword,
        role: overrides.role ?? Role.AUDITOR,
        approved: overrides.approved ?? true,
      },
    });
  }

  describe('findAll()', () => {
    it('returns users without password field', async () => {
      await seedUser({ email: 'alice@example.com' });
      await seedUser({ email: 'bob@example.com' });

      const users = await service.findAll();

      expect(users.length).toBe(2);
      for (const user of users) {
        expect(user).not.toHaveProperty('password');
      }
    });
  });

  describe('approve()', () => {
    it('sets approved=true', async () => {
      const user = await seedUser({ approved: false });

      const result = await service.approve(user.id);

      expect(result.approved).toBe(true);
    });

    it('throws NotFoundException for unknown id', async () => {
      await expect(service.approve('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changeRole()', () => {
    it('changes user role', async () => {
      const user = await seedUser({ role: Role.AUDITOR });
      const admin = await seedUser({ email: 'admin@example.com', role: Role.ADMIN });

      const result = await service.changeRole(user.id, Role.EDITOR, admin.id);

      expect(result.role).toBe(Role.EDITOR);
    });

    it('throws ForbiddenException when trying to change own role', async () => {
      const user = await seedUser({ role: Role.AUDITOR });

      await expect(service.changeRole(user.id, Role.ADMIN, user.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deactivate()', () => {
    it('sets approved=false', async () => {
      const user = await seedUser({ approved: true });
      const admin = await seedUser({ email: 'admin@example.com', role: Role.ADMIN });

      const result = await service.deactivate(user.id, admin.id);

      expect(result.approved).toBe(false);
    });

    it('throws ForbiddenException when trying to deactivate self', async () => {
      const user = await seedUser();

      await expect(service.deactivate(user.id, user.id)).rejects.toThrow(ForbiddenException);
    });
  });
});
