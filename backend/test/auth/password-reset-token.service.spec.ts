import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Role } from '@article30/shared';
import { PasswordResetTokenService } from '../../src/modules/auth/password-reset-token.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

describe('PasswordResetTokenService', () => {
  let module: TestingModule;
  let service: PasswordResetTokenService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [PasswordResetTokenService],
    }).compile();
    service = module.get(PasswordResetTokenService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  async function seedUser(): Promise<string> {
    const user = await prisma.user.create({
      data: {
        firstName: 'Token',
        lastName: 'User',
        email: 'tokenuser@example.com',
        password: await bcrypt.hash('Strongpass12', 10),
        role: Role.AUDITOR,
        approved: true,
      },
    });
    return user.id;
  }

  it('generates a 64-char hex token and stores its SHA-256 hash', async () => {
    const uid = await seedUser();
    const plaintext = await service.generate(uid);
    expect(plaintext).toMatch(/^[0-9a-f]{64}$/);
    const row = await prisma.passwordResetToken.findFirst({ where: { userId: uid } });
    expect(row).not.toBeNull();
    expect(row!.tokenHash).not.toBe(plaintext);
    expect(row!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row!.usedAt).toBeNull();
    expect(row!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('verify() returns the userId for a valid unused token', async () => {
    const uid = await seedUser();
    const plaintext = await service.generate(uid);
    const resolved = await service.verify(plaintext);
    expect(resolved).toBe(uid);
  });

  it('verify() returns null for a non-existent token', async () => {
    const resolved = await service.verify('0'.repeat(64));
    expect(resolved).toBeNull();
  });

  it('verify() returns null for an expired token', async () => {
    const uid = await seedUser();
    const plaintext = await service.generate(uid);
    await prisma.passwordResetToken.updateMany({
      where: { userId: uid },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const resolved = await service.verify(plaintext);
    expect(resolved).toBeNull();
  });

  it('verify() returns null for an already-used token', async () => {
    const uid = await seedUser();
    const plaintext = await service.generate(uid);
    await prisma.passwordResetToken.updateMany({
      where: { userId: uid },
      data: { usedAt: new Date() },
    });
    const resolved = await service.verify(plaintext);
    expect(resolved).toBeNull();
  });

  it('markUsed() sets usedAt on the token row', async () => {
    const uid = await seedUser();
    const plaintext = await service.generate(uid);
    await service.markUsed(plaintext);
    const row = await prisma.passwordResetToken.findFirst({ where: { userId: uid } });
    expect(row!.usedAt).not.toBeNull();
  });
});
