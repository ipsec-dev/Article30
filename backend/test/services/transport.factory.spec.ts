import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';

const { createTransportSpy } = vi.hoisted(() => ({
  createTransportSpy: vi.fn((opts: unknown) => ({ __opts: opts })),
}));

vi.mock('nodemailer', () => ({
  default: { createTransport: createTransportSpy },
}));

import { createMailTransport } from '../../src/modules/mail/transport.factory';

const ORIG_ENV = { ...process.env };

describe('createMailTransport', () => {
  let logger: Logger;

  beforeEach(() => {
    createTransportSpy.mockClear();
    process.env = { ...ORIG_ENV };
    logger = new Logger('test');
  });

  afterEach(() => {
    process.env = { ...ORIG_ENV };
  });

  it('returns jsonTransport + sink when NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test';
    const result = createMailTransport(logger);
    expect(result.sink).toEqual([]);
    expect(result.transport).toBeDefined();
    expect(result.enabled).toBe(true);
    expect(createTransportSpy).toHaveBeenCalledWith({ jsonTransport: true });
  });

  it('throws in production when SMTP_HOST is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;
    process.env.SMTP_PORT = '587';
    process.env.SMTP_FROM = 'a@b.test';
    expect(() => createMailTransport(logger)).toThrow(/SMTP_HOST, SMTP_PORT, and SMTP_FROM/);
  });

  it('throws in production when SMTP_PORT is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.SMTP_HOST = 'smtp.example.test';
    delete process.env.SMTP_PORT;
    process.env.SMTP_FROM = 'a@b.test';
    expect(() => createMailTransport(logger)).toThrow();
  });

  it('throws in production when SMTP_FROM is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.SMTP_HOST = 'smtp.example.test';
    process.env.SMTP_PORT = '587';
    delete process.env.SMTP_FROM;
    expect(() => createMailTransport(logger)).toThrow();
  });

  it('returns transport with null sink when all production env vars are set', () => {
    process.env.NODE_ENV = 'production';
    process.env.SMTP_HOST = 'smtp.example.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_FROM = 'noreply@example.test';
    const result = createMailTransport(logger);
    expect(result.sink).toBeNull();
    expect(result.transport).toBeDefined();
    expect(result.enabled).toBe(true);
    expect(createTransportSpy).toHaveBeenCalledOnce();
    const opts = createTransportSpy.mock.calls[0][0] as {
      host: string;
      port: number;
      secure: boolean;
      auth: unknown;
    };
    expect(opts.host).toBe('smtp.example.test');
    expect(opts.port).toBe(587);
    expect(opts.secure).toBe(false);
    expect(opts.auth).toBeUndefined();
  });

  it('uses localhost:1025 defaults in development when SMTP_HOST/PORT unset', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    const result = createMailTransport(logger);
    expect(result.sink).toBeNull();
    expect(result.transport).toBeDefined();
    expect(result.enabled).toBe(true);
    const opts = createTransportSpy.mock.calls[0][0] as { host: string; port: number };
    expect(opts.host).toBe('localhost');
    expect(opts.port).toBe(1025);
  });

  it('enables secure mode when SMTP_PORT=465', () => {
    process.env.NODE_ENV = 'development';
    process.env.SMTP_HOST = 'smtp.example.test';
    process.env.SMTP_PORT = '465';
    const { transport } = createMailTransport(logger);
    expect(transport).toBeDefined();
    const opts = createTransportSpy.mock.calls[0][0] as { secure: boolean };
    expect(opts.secure).toBe(true);
  });

  it('includes auth when SMTP_USER and SMTP_PASS are both set', () => {
    process.env.NODE_ENV = 'development';
    process.env.SMTP_HOST = 'smtp.example.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'alice';
    process.env.SMTP_PASS = 'secret';
    createMailTransport(logger);
    const opts = createTransportSpy.mock.calls[0][0] as { auth: { user: string; pass: string } };
    expect(opts.auth).toEqual({ user: 'alice', pass: 'secret' });
  });

  it('omits auth when only SMTP_USER is set (no SMTP_PASS)', () => {
    process.env.NODE_ENV = 'development';
    process.env.SMTP_HOST = 'smtp.example.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'alice';
    delete process.env.SMTP_PASS;
    createMailTransport(logger);
    const opts = createTransportSpy.mock.calls[0][0] as { auth: unknown };
    expect(opts.auth).toBeUndefined();
  });

  it('returns enabled=false without creating a transport when SMTP_ENABLED=false', () => {
    process.env.NODE_ENV = 'production';
    process.env.SMTP_ENABLED = 'false';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_FROM;
    const result = createMailTransport(logger);
    expect(result.enabled).toBe(false);
    expect(result.transport).toBeNull();
    expect(result.sink).toBeNull();
    expect(createTransportSpy).not.toHaveBeenCalled();
  });

  it('still honors SMTP_ENABLED=false even when host/port/from are present', () => {
    process.env.NODE_ENV = 'production';
    process.env.SMTP_ENABLED = 'false';
    process.env.SMTP_HOST = 'smtp.example.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_FROM = 'noreply@example.test';
    const result = createMailTransport(logger);
    expect(result.enabled).toBe(false);
    expect(createTransportSpy).not.toHaveBeenCalled();
  });

  it('defaults enabled=true when SMTP_ENABLED is unset (backwards compat)', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SMTP_ENABLED;
    const result = createMailTransport(logger);
    expect(result.enabled).toBe(true);
    expect(result.transport).not.toBeNull();
  });
});
