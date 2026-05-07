import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../../src/modules/users/users.service';
import { PasswordResetTokenService } from '../../src/modules/auth/password-reset-token.service';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { MailService } from '../../src/modules/mail/mail.service';

function makeService({ mailEnabled = false }: { mailEnabled?: boolean } = {}) {
  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
  } as unknown as import('../../src/prisma/prisma.service').PrismaService;
  const tokens = {
    generate: vi.fn().mockResolvedValue('plaintext-token'),
  } as unknown as PasswordResetTokenService;
  const audit = { create: vi.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
  const mail = {
    isEnabled: vi.fn().mockReturnValue(mailEnabled),
    send: vi.fn().mockResolvedValue(undefined),
  } as unknown as MailService;
  const svc = new UsersService(prisma, tokens, audit, mail);
  return { svc, prisma, tokens, audit, mail };
}

describe('UsersService.adminResetPassword', () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://app.test';
  });

  afterEach(() => {
    delete process.env.FRONTEND_URL;
  });

  it('returns { resetUrl, expiresInMinutes, emailed } for a valid target', async () => {
    const { svc, prisma } = makeService();
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'target-1',
      email: 'target@example.test',
    });
    const result = await svc.adminResetPassword('target-1', 'admin-1');
    expect(result).toEqual({
      resetUrl: 'https://app.test/reset-password?token=plaintext-token',
      expiresInMinutes: 60,
      emailed: false,
    });
  });

  it('throws ForbiddenException when actor === target', async () => {
    const { svc } = makeService();
    await expect(svc.adminResetPassword('same-id', 'same-id')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when target does not exist', async () => {
    const { svc, prisma } = makeService();
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(svc.adminResetPassword('ghost', 'admin-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('writes an audit-log entry with action user.admin_password_reset_issued', async () => {
    const { svc, prisma, audit } = makeService();
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'target-1',
      email: 'target@example.test',
    });
    await svc.adminResetPassword('target-1', 'admin-1');
    expect(audit.create).toHaveBeenCalledWith({
      action: 'user.admin_password_reset_issued',
      entity: 'user',
      entityId: 'target-1',
      performedBy: 'admin-1',
    });
  });

  it('does NOT call mail.send when SMTP is disabled, returns emailed=false', async () => {
    const { svc, prisma, mail } = makeService({ mailEnabled: false });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'target-1',
      email: 'target@example.test',
    });
    const result = await svc.adminResetPassword('target-1', 'admin-1');
    expect(mail.send).not.toHaveBeenCalled();
    expect(result.emailed).toBe(false);
    expect(result.resetUrl).toBe('https://app.test/reset-password?token=plaintext-token');
  });

  it('emails the target user when SMTP is enabled, still returns the URL to the admin', async () => {
    const { svc, prisma, mail } = makeService({ mailEnabled: true });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'target-1',
      email: 'target@example.test',
    });
    const result = await svc.adminResetPassword('target-1', 'admin-1', 'fr-FR,fr;q=0.9');
    expect(mail.send).toHaveBeenCalledWith({
      to: 'target@example.test',
      templateId: 'admin-password-reset',
      locale: 'fr',
      context: {
        resetUrl: 'https://app.test/reset-password?token=plaintext-token',
        expiresInMinutes: '60',
      },
    });
    expect(result.emailed).toBe(true);
    expect(result.resetUrl).toBe('https://app.test/reset-password?token=plaintext-token');
  });
});
