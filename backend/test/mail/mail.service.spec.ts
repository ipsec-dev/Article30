import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { MailService } from '../../src/modules/mail/mail.service';

describe('MailService', () => {
  let service: MailService;
  let sink: Array<{ to: string; subject: string; text: string }>;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    process.env.SMTP_FROM = 'test@example.local';
    sink = [];
    service = new MailService();
    const transport = nodemailer.createTransport({ jsonTransport: true });
    service.setTransportForTesting(transport as unknown as nodemailer.Transporter, sink);
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    delete process.env.SMTP_FROM;
  });

  it('sends an English password-reset email with interpolated variables', async () => {
    await service.send({
      to: 'alice@example.com',
      templateId: 'password-reset',
      locale: 'en',
      context: {
        resetUrl: 'https://app.example.com/reset-password?token=abc',
        expiresInMinutes: '60',
      },
    });
    expect(sink).toHaveLength(1);
    expect(sink[0].to).toBe('alice@example.com');
    expect(sink[0].subject).toBe('Reset your Article30 password');
    expect(sink[0].text).toContain('https://app.example.com/reset-password?token=abc');
    expect(sink[0].text).toContain('60 minutes');
  });

  it('sends a French password-reset email when locale=fr', async () => {
    await service.send({
      to: 'bob@example.com',
      templateId: 'password-reset',
      locale: 'fr',
      context: { resetUrl: 'https://x', expiresInMinutes: '60' },
    });
    expect(sink[0].subject).toBe('Réinitialisation de votre mot de passe Article30');
  });

  it('sends the password-changed confirmation', async () => {
    await service.send({
      to: 'carol@example.com',
      templateId: 'password-changed',
      locale: 'en',
      context: {},
    });
    expect(sink[0].subject).toBe('Your Article30 password was changed');
  });

  it('is a no-op when disabled, does not touch transport, emits mail.skipped', async () => {
    const disabled = new MailService();
    disabled.setDisabledForTesting();
    const logSpy = vi.spyOn(
      (disabled as unknown as { logger: { log: (...a: unknown[]) => void } }).logger,
      'log',
    );

    await disabled.send({
      to: 'dan@example.com',
      templateId: 'password-reset',
      locale: 'en',
      context: { resetUrl: 'https://x', expiresInMinutes: '60' },
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'mail.skipped', reason: 'smtp_disabled' }),
    );
    expect(disabled.isEnabled()).toBe(false);
  });

  it('isEnabled() returns true after setTransportForTesting', () => {
    expect(service.isEnabled()).toBe(true);
  });
});
