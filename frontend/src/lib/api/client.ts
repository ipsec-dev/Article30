import { toast } from 'sonner';

const HTTP_NO_CONTENT = 204;
const HTTP_FORBIDDEN = 403;
const CSRF_ERROR_MESSAGE = 'Invalid CSRF token';

function getCsrfToken(): string | null {
  const match = /(?:^|;\s*)XSRF-TOKEN=([^;]*)/.exec(document.cookie);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

async function doFetch(path: string, options?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }
  return fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });
}

async function isCsrfError(res: Response): Promise<boolean> {
  if (res.status !== HTTP_FORBIDDEN) {
    return false;
  }
  const body = await res
    .clone()
    .json()
    .catch(() => null);
  return body?.message === CSRF_ERROR_MESSAGE;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res = await doFetch(path, options);

  // One-shot recovery: if we got a CSRF 403, re-prime the cookie via a safe
  // GET to /api/auth/me (which makes the backend re-issue XSRF-TOKEN for the
  // current session) then retry the original request exactly once. Covers
  // fresh-tab, stale-session, and server-restart cases — see the CSRF
  // middleware's session-bound token design.
  if (await isCsrfError(res)) {
    // Bare fetch — NOT api.get — to avoid recursing through this same retry logic.
    await fetch('/api/auth/me', { credentials: 'include' });
    res = await doFetch(path, options);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new ApiError(res.status, body.message || res.statusText);
    console.info(`[API] ${options?.method || 'GET'} ${path} → ${res.status}: ${error.message}`);
    toast.error(error.message);
    throw error;
  }

  if (res.status === HTTP_NO_CONTENT) {
    return undefined as T;
  }
  // Some endpoints return 200/201 with an empty body (e.g. status-changing
  // transitions that don't echo the entity). Calling res.json() on that
  // throws "Unexpected end of JSON input"; read text first and decide.
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function serializeBody(body?: unknown): string | undefined {
  if (!body) {
    return undefined;
  }
  return JSON.stringify(body);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: serializeBody(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: serializeBody(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: serializeBody(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
