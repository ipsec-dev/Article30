import { describe, it, expect, vi } from 'vitest';
import {
  csrfMiddleware,
  generateCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
} from '../../src/common/middleware/csrf.middleware';

function createMockReqRes(overrides: {
  method?: string;
  session?: Record<string, unknown> | null;
  headers?: Record<string, string>;
}) {
  let session: Record<string, unknown> | null;
  if (overrides.session === undefined) {
    session = {};
  } else {
    session = overrides.session;
  }
  const req = {
    session,
    method: overrides.method ?? 'GET',
    headers: overrides.headers ?? {},
  } as unknown as Parameters<typeof csrfMiddleware>[0];

  const res = {
    cookie: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Parameters<typeof csrfMiddleware>[1];

  const next = vi.fn();

  return { req, res, next };
}

const CSRF_TOKEN_LENGTH = 64;
const HTTP_FORBIDDEN = 403;
const METHOD_GET = 'GET';
const METHOD_POST = 'POST';

describe('csrfMiddleware', () => {
  it('generates csrfToken in session (should be 64-char hex string)', () => {
    const { req, res, next } = createMockReqRes({ method: METHOD_GET });

    csrfMiddleware(req, res, next);

    expect(req.session.csrfToken).toBeDefined();
    expect(typeof req.session.csrfToken).toBe('string');
    expect(req.session.csrfToken).toHaveLength(CSRF_TOKEN_LENGTH);
    expect(req.session.csrfToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sets XSRF-TOKEN cookie with httpOnly: false', () => {
    const { req, res, next } = createMockReqRes({ method: METHOD_GET });

    csrfMiddleware(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      req.session.csrfToken,
      expect.objectContaining({ httpOnly: false }),
    );
  });

  it('allows GET without CSRF header', () => {
    const { req, res, next } = createMockReqRes({ method: METHOD_GET });

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows HEAD without CSRF header', () => {
    const { req, res, next } = createMockReqRes({ method: 'HEAD' });

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows OPTIONS without CSRF header', () => {
    const { req, res, next } = createMockReqRes({ method: 'OPTIONS' });

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when POST has no X-XSRF-TOKEN header', () => {
    const { req, res, next } = createMockReqRes({
      method: METHOD_POST,
      headers: {},
    });

    csrfMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(HTTP_FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid CSRF token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when header does not match session token', () => {
    const { req, res, next } = createMockReqRes({
      method: METHOD_POST,
      session: { csrfToken: 'correct-token' },
      headers: { 'x-xsrf-token': 'wrong-token' },
    });

    csrfMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(HTTP_FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid CSRF token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows POST when header matches session token', () => {
    const token = 'a'.repeat(CSRF_TOKEN_LENGTH);
    const { req, res, next } = createMockReqRes({
      method: METHOD_POST,
      session: { csrfToken: token },
      headers: { 'x-xsrf-token': token },
    });

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('skips entirely when no session (req.session is null)', () => {
    const { req, res, next } = createMockReqRes({
      method: METHOD_POST,
      session: null,
      headers: {},
    });

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('generateCsrfToken', () => {
  it('returns a 64-char hex string', () => {
    const t = generateCsrfToken();
    expect(t).toHaveLength(CSRF_TOKEN_LENGTH);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns a different token each call', () => {
    expect(generateCsrfToken()).not.toBe(generateCsrfToken());
  });
});

describe('setCsrfCookie', () => {
  it('sets XSRF-TOKEN with httpOnly: false, sameSite: lax, path: /', () => {
    const res = { cookie: vi.fn() } as unknown as Parameters<typeof setCsrfCookie>[0];
    setCsrfCookie(res, 'tok');
    expect(res.cookie).toHaveBeenCalledWith('XSRF-TOKEN', 'tok', {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
  });
});

describe('clearCsrfCookie', () => {
  it('clears XSRF-TOKEN at path /', () => {
    const res = { clearCookie: vi.fn() } as unknown as Parameters<typeof clearCsrfCookie>[0];
    clearCsrfCookie(res);
    expect(res.clearCookie).toHaveBeenCalledWith('XSRF-TOKEN', {
      path: '/',
      secure: false, // COOKIE_SECURE unset in test env
      sameSite: 'lax',
    });
  });
});
