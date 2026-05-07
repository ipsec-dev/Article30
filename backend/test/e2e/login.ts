import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

const CSRF_HEADER = 'x-xsrf-token';
const CSRF_COOKIE_RE = /^XSRF-TOKEN=([^;]+)/;

function readCsrfFromSetCookie(setCookie: string | string[] | undefined): string | null {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const xsrf = cookies.find(c => c.startsWith('XSRF-TOKEN='));
  if (!xsrf) return null;
  const match = CSRF_COOKIE_RE.exec(xsrf);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

/**
 * Primes a fresh supertest agent with a CSRF token by issuing a safe-method
 * GET (csrfMiddleware sets the XSRF-TOKEN cookie on any safe request
 * regardless of response status — /api/auth/me returns 401 when
 * unauthenticated but still sets the cookie because csrfMiddleware runs
 * before AuthGuard).
 *
 * The returned `agent` holds the cookie in its jar; the returned
 * `csrfToken` is what callers must set as the `x-xsrf-token` header on
 * every non-safe (POST/PUT/PATCH/DELETE) request.
 */
export async function primeCsrf(app: INestApplication): Promise<{
  agent: ReturnType<typeof request.agent>;
  csrfToken: string;
}> {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.get('/api/auth/me');
  const csrfToken = readCsrfFromSetCookie(res.headers['set-cookie']);
  if (!csrfToken) {
    throw new Error(
      `primeCsrf: priming GET /api/auth/me did not set an XSRF-TOKEN cookie (status ${res.status})`,
    );
  }
  return { agent, csrfToken };
}

/**
 * Performs POST /api/auth/login with the given email + password, returning
 * an authenticated supertest agent and the CSRF token pinned to its jar.
 *
 * Uses primeCsrf() internally so the login POST carries the required
 * x-xsrf-token header. AuthController.login calls req.session.regenerate(),
 * which rotates both the session id and the server-side csrfToken, so we
 * re-prime after login with a safe GET /api/auth/me to capture the *post-
 * regeneration* token. The returned csrfToken is the one that matches the
 * authenticated session and can be sent directly on any subsequent non-
 * safe method via .set('x-xsrf-token', csrfToken).
 */
export async function loginAs(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ agent: ReturnType<typeof request.agent>; csrfToken: string }> {
  const { agent, csrfToken: preLoginToken } = await primeCsrf(app);
  const res = await agent
    .post('/api/auth/login')
    .set(CSRF_HEADER, preLoginToken)
    .set('Accept', 'application/json')
    .send({ email, password });
  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`loginAs failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const setCookies = res.headers['set-cookie'];
  const cookies = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
  if (!cookies.some(c => c.startsWith('connect.sid='))) {
    throw new Error(
      `loginAs: POST /api/auth/login returned ${res.status} but did not set a connect.sid cookie`,
    );
  }
  // Session regeneration rotated the CSRF token — fetch the fresh one so
  // callers can immediately POST/PATCH/DELETE without another priming round.
  const refresh = await agent.get('/api/auth/me');
  const csrfToken = readCsrfFromSetCookie(refresh.headers['set-cookie']) ?? preLoginToken;
  return { agent, csrfToken };
}
