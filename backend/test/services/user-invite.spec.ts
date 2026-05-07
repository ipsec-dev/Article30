import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Role } from '@article30/shared';
import { UsersService } from '../../src/modules/users/users.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import type { PasswordResetTokenService } from '../../src/modules/auth/password-reset-token.service';
import type { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import type { MailService } from '../../src/modules/mail/mail.service';

function makeService({ mailEnabled = false }: { mailEnabled?: boolean } = {}) {
  const txClient = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
  const prisma = {
    $transaction: vi
      .fn()
      .mockImplementation(async (cb: (tx: typeof txClient) => unknown) => cb(txClient)),
    user: txClient.user,
  } as unknown as PrismaService;
  const tokens = {
    generate: vi.fn().mockResolvedValue('plaintext-token'),
  } as unknown as PasswordResetTokenService;
  const audit = { create: vi.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
  const mail = {
    isEnabled: vi.fn().mockReturnValue(mailEnabled),
    send: vi.fn().mockResolvedValue(undefined),
  } as unknown as MailService;
  const svc = new UsersService(prisma, tokens, audit, mail);
  return { svc, prisma, txClient, tokens, audit, mail };
}

describe('UsersService.invite', () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://app.test';
  });
  afterEach(() => {
    delete process.env.FRONTEND_URL;
  });

  it('creates the user, issues a reset URL, and writes an audit entry', async () => {
    const { svc, prisma, txClient, tokens, audit } = makeService();
    txClient.user.findUnique.mockResolvedValue(null);
    txClient.user.create.mockResolvedValue({
      id: 'new-1',
      email: 'alice@example.test',
      firstName: '',
      lastName: '',
      role: Role.EDITOR,
    });

    const result = await svc.invite({ email: 'alice@example.test', role: Role.EDITOR }, 'admin-1');

    expect(result).toEqual({
      user: { id: 'new-1', email: 'alice@example.test', role: Role.EDITOR },
      resetUrl: 'https://app.test/reset-password?token=plaintext-token&invite=1',
      expiresInMinutes: 60,
      emailed: false,
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(tokens.generate).toHaveBeenCalledWith('new-1');
    expect(audit.create).toHaveBeenCalledWith({
      action: 'user.invited',
      entity: 'user',
      entityId: 'new-1',
      performedBy: 'admin-1',
      newValue: { email: 'alice@example.test', role: Role.EDITOR },
    });
  });

  it('throws ConflictException when email is already in use', async () => {
    const { svc, txClient, tokens, audit } = makeService();
    txClient.user.findUnique.mockResolvedValue({ id: 'existing-1' });

    await expect(
      svc.invite({ email: 'taken@example.test', role: Role.EDITOR }, 'admin-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(txClient.user.create).not.toHaveBeenCalled();
    expect(tokens.generate).not.toHaveBeenCalled();
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('stores a bcrypt-hashed random password (never the same across two invites)', async () => {
    const { svc, txClient } = makeService();
    txClient.user.findUnique.mockResolvedValue(null);
    txClient.user.create
      .mockResolvedValueOnce({
        id: 'new-1',
        email: 'a@test.local',
        firstName: '',
        lastName: '',
        role: Role.EDITOR,
      })
      .mockResolvedValueOnce({
        id: 'new-2',
        email: 'b@test.local',
        firstName: '',
        lastName: '',
        role: Role.EDITOR,
      });

    await svc.invite({ email: 'a@test.local', role: Role.EDITOR }, 'admin-1');
    await svc.invite({ email: 'b@test.local', role: Role.EDITOR }, 'admin-1');

    const firstCallPassword = txClient.user.create.mock.calls[0][0].data.password;
    const secondCallPassword = txClient.user.create.mock.calls[1][0].data.password;
    expect(firstCallPassword).not.toEqual(secondCallPassword);
    expect(firstCallPassword).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt prefix
    expect(await bcrypt.compare('password', firstCallPassword)).toBe(false);
  });

  it('writes the audit entry BEFORE generating the reset token', async () => {
    const { svc, txClient, tokens, audit } = makeService();
    txClient.user.findUnique.mockResolvedValue(null);
    txClient.user.create.mockResolvedValue({
      id: 'new-1',
      email: 'alice@example.test',
      firstName: '',
      lastName: '',
      role: Role.EDITOR,
    });
    const callOrder: string[] = [];
    (audit.create as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push('audit');
    });
    (tokens.generate as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push('tokens');
      return 'plaintext-token';
    });

    await svc.invite({ email: 'alice@example.test', role: Role.EDITOR }, 'admin-1');
    expect(callOrder).toEqual(['audit', 'tokens']);
  });

  it('creates the invitee with approved=false', async () => {
    const { svc, txClient } = makeService();
    txClient.user.findUnique.mockResolvedValue(null);
    txClient.user.create.mockResolvedValue({
      id: 'new-1',
      email: 'new@example.com',
      firstName: '',
      lastName: '',
      role: Role.EDITOR,
    });

    await svc.invite({ email: 'new@example.com', role: Role.EDITOR }, 'admin-user-id');

    const createCallData = txClient.user.create.mock.calls[0][0].data;
    expect(createCallData.approved).toBe(false);
  });

  it('does NOT call mail.send when SMTP is disabled, returns emailed=false', async () => {
    const { svc, txClient, mail } = makeService({ mailEnabled: false });
    txClient.user.findUnique.mockResolvedValue(null);
    txClient.user.create.mockResolvedValue({
      id: 'new-1',
      email: 'alice@example.test',
      firstName: '',
      lastName: '',
      role: Role.EDITOR,
    });

    const result = await svc.invite({ email: 'alice@example.test', role: Role.EDITOR }, 'admin-1');

    expect(mail.send).not.toHaveBeenCalled();
    expect(result.emailed).toBe(false);
    expect(result.resetUrl).toBe('https://app.test/reset-password?token=plaintext-token&invite=1');
  });

  it('emails the invitee when SMTP is enabled, still returns the URL to the admin', async () => {
    const { svc, txClient, mail } = makeService({ mailEnabled: true });
    txClient.user.findUnique.mockResolvedValue(null);
    txClient.user.create.mockResolvedValue({
      id: 'new-1',
      email: 'alice@example.test',
      firstName: '',
      lastName: '',
      role: Role.EDITOR,
    });

    const result = await svc.invite(
      { email: 'alice@example.test', role: Role.EDITOR },
      'admin-1',
      'fr-FR,fr;q=0.9',
    );

    expect(mail.send).toHaveBeenCalledWith({
      to: 'alice@example.test',
      templateId: 'user-invite',
      locale: 'fr',
      context: {
        resetUrl: 'https://app.test/reset-password?token=plaintext-token&invite=1',
        expiresInMinutes: '60',
      },
    });
    expect(result.emailed).toBe(true);
    expect(result.resetUrl).toBe('https://app.test/reset-password?token=plaintext-token&invite=1');
  });
});
