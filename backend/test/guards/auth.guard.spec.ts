import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AuthGuard } from '../../src/common/guards/auth.guard';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createMockContext, createTestModule, cleanupDatabase } from '../helpers';
import { Role } from '@article30/shared';

describe('AuthGuard', () => {
  let prisma: PrismaService;
  let guard: AuthGuard;
  let reflector: Reflector;

  beforeAll(async () => {
    const module = await createTestModule();
    prisma = module.get(PrismaService);
    reflector = new Reflector();
    guard = new AuthGuard(reflector, prisma);
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await prisma.$disconnect();
  });

  async function seedUser(opts: { email: string; role: Role }) {
    const hashedPassword = await bcrypt.hash('test-password', 10);
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: opts.email,
        password: hashedPassword,
        role: opts.role,
        approved: true,
      },
    });
    return user;
  }

  it('returns true and sets request.user when session has valid userId', async () => {
    const user = await seedUser({
      email: 'auth-test@example.com',
      role: Role.AUDITOR,
    });

    const { context, request } = createMockContext({ session: { userId: user.id } });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toBeDefined();
    expect(request.user.id).toBe(user.id);
    expect(request.user.email).toBe(user.email);
    expect(request.user.role).toBe(Role.AUDITOR);
    expect(request.user.approved).toBe(true);
  });

  it('request.user does NOT contain password', async () => {
    const user = await seedUser({
      email: 'auth-no-pwd@example.com',
      role: Role.EDITOR,
    });

    const { context, request } = createMockContext({ session: { userId: user.id } });
    await guard.canActivate(context);

    expect(request.user).not.toHaveProperty('password');
  });

  it('throws UnauthorizedException when no session userId', async () => {
    const { context } = createMockContext({ session: {} });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when userId not found in DB', async () => {
    const { context } = createMockContext({ session: { userId: 'non-existent-id-00000000' } });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('skips auth for @Public() routes', async () => {
    const { context } = createMockContext({ session: {}, isPublic: true });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
