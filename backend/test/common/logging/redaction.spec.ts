import { describe, it, expect } from 'vitest';
import pino from 'pino';
import { buildPinoOptions } from '../../../src/common/logging/pino.config';

type Line = Record<string, unknown>;

function makeCapturingLogger(): { logger: pino.Logger; lines: Line[] } {
  const lines: Line[] = [];
  const destination = {
    write: (chunk: string) => {
      for (const raw of chunk.split('\n')) {
        if (!raw) continue;
        lines.push(JSON.parse(raw));
      }
      return true;
    },
  };
  const options = buildPinoOptions().pinoHttp ?? {};
  // Re-use the same redact/formatters config but bypass the pretty transport.
  const { transport: _transport, ...base } = options as Record<string, unknown>;
  const logger = pino(
    { ...base, level: 'trace' },
    destination as unknown as pino.DestinationStream,
  );
  return { logger, lines };
}

describe('logger redaction', () => {
  it('strips password-adjacent fields', () => {
    const { logger, lines } = makeCapturingLogger();
    logger.info({
      event: 'auth.user',
      user: { id: 'u1', password: 'hunter2', passwordHash: 'argon2$...', email: 'a@b.c' },
    });
    const payload = lines[0] as {
      user: { password?: unknown; passwordHash?: unknown; email?: unknown; id?: unknown };
    };
    expect(payload.user.password).toBeUndefined();
    expect(payload.user.passwordHash).toBeUndefined();
    expect(payload.user.id).toBe('u1');
    expect(payload.user.email).toBe('[Redacted]');
  });

  it('strips auth/cookie headers and censors ip', () => {
    const { logger, lines } = makeCapturingLogger();
    logger.info({
      event: 'http.request',
      req: {
        headers: {
          authorization: 'Bearer abc',
          cookie: 'session=xyz',
          'x-forwarded-for': '1.2.3.4',
        },
        ip: '1.2.3.4',
      },
    });
    const { req } = lines[0] as { req: { headers: Record<string, unknown>; ip?: unknown } };
    expect(req.headers.authorization).toBeUndefined();
    expect(req.headers.cookie).toBeUndefined();
    expect(req.headers['x-forwarded-for']).toBe('[Redacted]');
    expect(req.ip).toBe('[Redacted]');
  });

  it('censors phone and email at nested depth', () => {
    const { logger, lines } = makeCapturingLogger();
    logger.info({
      event: 'entity.dump',
      payload: { user: { phone: '+33600000000', email: 'x@y.z' } },
    });
    const { payload } = lines[0] as { payload: { user: Record<string, unknown> } };
    expect(payload.user.phone).toBe('[Redacted]');
    expect(payload.user.email).toBe('[Redacted]');
  });
});

describe('captureLogs helper', () => {
  it('captures an event object round-trip', async () => {
    const { captureLogs } = await import('../../helpers/capture-logs');
    const { logger, lines } = captureLogs();
    logger.info({ event: 'x.y', foo: 1 });
    expect(lines[0]).toMatchObject({ event: 'x.y', foo: 1, level: 'info' });
  });
});
