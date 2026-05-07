import { Request, Response, NextFunction } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const SAFE_METHODS: Set<string> = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'x-xsrf-token';
const CSRF_TOKEN_BYTE_LENGTH = 32;
const FORBIDDEN_STATUS = 403;

function safeCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_BYTE_LENGTH).toString('hex');
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/',
  });
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE, {
    path: '/',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
  });
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.session) {
    next();
    return;
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }

  setCsrfCookie(res, req.session.csrfToken);

  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const headerToken = req.headers[CSRF_HEADER] as string | undefined;
  if (!headerToken || !safeCompare(headerToken, req.session.csrfToken)) {
    res.status(FORBIDDEN_STATUS).json({ message: 'Invalid CSRF token' });
    return;
  }

  next();
}
