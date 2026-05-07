import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcrypt';
import {
  resetPassword,
  parseArgs,
  type ResetPasswordDeps,
  type ResetPasswordArgs,
} from '../../scripts/reset-password';

function makeDeps(overrides: Partial<ResetPasswordDeps> = {}): ResetPasswordDeps {
  const prismaUser = {
    findUnique: vi.fn().mockResolvedValue({ id: 'u-1', email: 'a@example.test' }),
    update: vi.fn().mockResolvedValue({ id: 'u-1' }),
  };
  const tokenService = { generate: vi.fn().mockResolvedValue('plaintext-token') };
  const sessionService = { destroyAllForUser: vi.fn().mockResolvedValue(undefined) };
  return {
    prisma: { user: prismaUser } as unknown as ResetPasswordDeps['prisma'],
    tokenService: tokenService as unknown as ResetPasswordDeps['tokenService'],
    sessionService: sessionService as unknown as ResetPasswordDeps['sessionService'],
    frontendUrl: 'https://app.test',
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    bcryptSaltRounds: 4,
    ...overrides,
  };
}

describe('reset-password CLI', () => {
  let deps: ResetPasswordDeps;
  beforeEach(() => {
    deps = makeDeps();
  });

  it('token mode prints a reset URL with 60-minute expiry', async () => {
    const args: ResetPasswordArgs = { email: 'a@example.test' };
    const result = await resetPassword(args, deps);
    expect(result).toEqual({
      ok: true,
      mode: 'token',
      resetUrl: 'https://app.test/reset-password?token=plaintext-token',
      expiresInMinutes: 60,
    });
    expect(deps.tokenService.generate).toHaveBeenCalledWith('u-1');
    expect(deps.prisma.user.update).not.toHaveBeenCalled();
    expect(deps.sessionService.destroyAllForUser).not.toHaveBeenCalled();
  });

  it('direct mode updates the password and destroys sessions', async () => {
    const args: ResetPasswordArgs = { email: 'a@example.test', password: 'Newstrongpass1' };
    const result = await resetPassword(args, deps);
    expect(result).toMatchObject({ ok: true, mode: 'direct' });
    expect(deps.prisma.user.update).toHaveBeenCalledTimes(1);
    const updateArg = (deps.prisma.user.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 'u-1' });
    expect(typeof updateArg.data.password).toBe('string');
    expect(await bcrypt.compare('Newstrongpass1', updateArg.data.password)).toBe(true);
    expect(deps.sessionService.destroyAllForUser).toHaveBeenCalledWith('u-1');
  });

  it('direct mode rejects weak passwords without touching the database', async () => {
    const args: ResetPasswordArgs = { email: 'a@example.test', password: 'weak' };
    const result = await resetPassword(args, deps);
    expect(result).toMatchObject({ ok: false, reason: 'weak_password' });
    expect(deps.prisma.user.update).not.toHaveBeenCalled();
    expect(deps.sessionService.destroyAllForUser).not.toHaveBeenCalled();
  });

  it('returns not_found for an unknown email', async () => {
    (deps.prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const args: ResetPasswordArgs = { email: 'ghost@example.test' };
    const result = await resetPassword(args, deps);
    expect(result).toMatchObject({ ok: false, reason: 'not_found' });
  });
});

describe('reset-password parseArgs', () => {
  it('parses --email alone (token mode)', () => {
    expect(parseArgs(['--email', 'a@example.test'])).toEqual({ email: 'a@example.test' });
  });

  it('parses --email + --password (direct mode)', () => {
    expect(parseArgs(['--email', 'a@example.test', '--password', 'Newstrongpass1'])).toEqual({
      email: 'a@example.test',
      password: 'Newstrongpass1',
    });
  });

  it('errors when --email is missing', () => {
    expect(parseArgs([])).toEqual({ error: 'missing --email' });
  });

  it('errors when --password has no following value', () => {
    expect(parseArgs(['--email', 'a@example.test', '--password'])).toEqual({
      error: '--password requires a value',
    });
  });

  it('errors when --password is followed by another flag', () => {
    expect(parseArgs(['--password', '--email', 'a@example.test'])).toEqual({
      error: '--password requires a value',
    });
  });

  it('errors on unknown flags', () => {
    expect(parseArgs(['--email', 'a@example.test', '--weird'])).toEqual({
      error: 'unknown flag --weird',
    });
  });
});
