import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '@/lib/api/client';
import { toast } from 'sonner';

function mockFetchResponse(
  init: {
    status?: number;
    ok?: boolean;
    body?: unknown;
    /** Set true to emulate a response with truly no body (text() returns ''). */
    empty?: boolean;
    statusText?: string;
  } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  const body = init.body ?? {};
  const text = init.empty ? '' : JSON.stringify(body);
  const res = {
    ok,
    status,
    statusText: init.statusText ?? '',
    json: async () => body,
    text: async () => text,
    clone: () => ({
      json: async () => body,
      text: async () => text,
    }),
  } as unknown as Response;
  return res;
}

describe('api client', () => {
  const fetchSpy = vi.fn<typeof fetch>();
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSpy);
    // jsdom does not clear cookies with `document.cookie = ''`; expire each name.
    for (const entry of document.cookie.split(';')) {
      const name = entry.split('=')[0]?.trim();
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    }
    fetchSpy.mockReset();
    vi.mocked(toast.error).mockReset();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    consoleErrorSpy.mockRestore();
  });

  describe('CSRF header', () => {
    it('injects X-XSRF-TOKEN when the XSRF-TOKEN cookie is set (URL-decoded)', async () => {
      document.cookie = 'XSRF-TOKEN=abc%2Fxyz';
      fetchSpy.mockResolvedValue(mockFetchResponse({ body: { ok: true } }));
      await api.get('/me');
      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers['X-XSRF-TOKEN']).toBe('abc/xyz');
    });

    it('omits the header when the cookie is absent', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse({ body: { ok: true } }));
      await api.get('/me');
      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers['X-XSRF-TOKEN']).toBeUndefined();
    });
  });

  describe('response handling', () => {
    it('returns the JSON body on a 200 response', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse({ body: { id: 'u1', name: 'Alice' } }));
      const result = await api.get<{ id: string; name: string }>('/auth/me');
      expect(result).toEqual({ id: 'u1', name: 'Alice' });
    });

    it('returns undefined on a 204 No Content response', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse({ status: 204 }));
      const result = await api.delete('/things/1');
      expect(result).toBeUndefined();
    });

    it('returns undefined on a 200 response with an empty body', async () => {
      // Some endpoints (status-changing transitions) return 200 but no body.
      // Calling res.json() on that throws "Unexpected end of JSON input";
      // the client must read text first and short-circuit on empty.
      fetchSpy.mockResolvedValue(mockFetchResponse({ status: 200, empty: true }));
      const result = await api.post('/things/1/transition');
      expect(result).toBeUndefined();
    });

    it('throws ApiError and calls toast.error on a 4xx response', async () => {
      fetchSpy.mockResolvedValue(
        mockFetchResponse({ status: 400, ok: false, body: { message: 'Bad request' } }),
      );
      await expect(api.post('/things', { foo: 'bar' })).rejects.toBeInstanceOf(ApiError);
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Bad request');
    });

    it('falls back to res.statusText when the error body has no message', async () => {
      fetchSpy.mockResolvedValue(
        mockFetchResponse({ status: 500, ok: false, body: {}, statusText: 'Internal Error' }),
      );
      // vitest 4.1.x's `rejects.toThrow(regex)` reads the rejected value as ''
      // for native Error subclasses. Workaround: assert on the message field.
      await expect(api.get('/things')).rejects.toMatchObject({ message: 'Internal Error' });
    });

    it('uses statusText when the body is not valid JSON', async () => {
      const failingResponse = {
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: async () => {
          throw new Error('parse failed');
        },
      } as unknown as Response;
      fetchSpy.mockResolvedValue(failingResponse);
      await expect(api.get('/things')).rejects.toMatchObject({ message: 'Bad Gateway' });
    });
  });

  describe('HTTP verbs', () => {
    it('POST sends a JSON-stringified body', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse({ status: 201, body: { id: 'x' } }));
      await api.post('/things', { name: 'x' });
      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ name: 'x' }));
    });

    it('PATCH sends a JSON-stringified body', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse({ body: { ok: true } }));
      await api.patch('/things/1', { name: 'y' });
      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('PATCH');
    });

    it('PUT sends a JSON-stringified body', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse({ body: { ok: true } }));
      await api.put('/things/1', { name: 'y' });
      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('PUT');
    });

    it('DELETE sends no body and returns undefined on 204', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse({ status: 204 }));
      const result = await api.delete('/things/1');
      expect(result).toBeUndefined();
      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('DELETE');
      expect(init.body).toBeUndefined();
    });
  });

  describe('ApiError', () => {
    it('carries the HTTP status on the error instance', async () => {
      fetchSpy.mockResolvedValue(
        mockFetchResponse({ status: 404, ok: false, body: { message: 'Not found' } }),
      );
      try {
        await api.get('/things/missing');
        throw new Error('expected ApiError');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(404);
        expect((err as ApiError).message).toBe('Not found');
      }
    });
  });

  describe('CSRF 403 retry', () => {
    it('on 403 "Invalid CSRF token", re-primes via GET /api/auth/me then retries once', async () => {
      document.cookie = 'XSRF-TOKEN=stale';
      fetchSpy
        .mockResolvedValueOnce(
          mockFetchResponse({ status: 403, ok: false, body: { message: 'Invalid CSRF token' } }),
        )
        .mockResolvedValueOnce(mockFetchResponse({ body: { ok: true } })) // GET /api/auth/me refresh
        .mockResolvedValueOnce(mockFetchResponse({ status: 201, body: { id: 'x' } })); // retry of original

      const result = await api.post('/things', { name: 'x' });

      expect(result).toEqual({ id: 'x' });
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      // First call: original POST /api/things
      expect(fetchSpy.mock.calls[0][0]).toBe('/api/things');
      // Second call: priming GET /api/auth/me with credentials
      expect(fetchSpy.mock.calls[1][0]).toBe('/api/auth/me');
      expect(fetchSpy.mock.calls[1][1]).toEqual(
        expect.objectContaining({ credentials: 'include' }),
      );
      // Third call: retry of original POST
      expect(fetchSpy.mock.calls[2][0]).toBe('/api/things');
      expect((fetchSpy.mock.calls[2][1] as RequestInit).method).toBe('POST');
      // User did NOT see an error toast — the retry succeeded
      expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
    });

    it('does not retry on 403 with a different error message', async () => {
      document.cookie = 'XSRF-TOKEN=good';
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ status: 403, ok: false, body: { message: 'Forbidden' } }),
      );
      await expect(api.post('/things', { name: 'x' })).rejects.toBeInstanceOf(ApiError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Forbidden');
    });

    it('does not retry on a non-403 error', async () => {
      document.cookie = 'XSRF-TOKEN=good';
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ status: 500, ok: false, body: { message: 'Oops' } }),
      );
      await expect(api.get('/things')).rejects.toBeInstanceOf(ApiError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('propagates the error if the retry also fails', async () => {
      document.cookie = 'XSRF-TOKEN=stale';
      fetchSpy
        .mockResolvedValueOnce(
          mockFetchResponse({ status: 403, ok: false, body: { message: 'Invalid CSRF token' } }),
        )
        .mockResolvedValueOnce(mockFetchResponse({ body: { ok: true } })) // priming call
        .mockResolvedValueOnce(
          mockFetchResponse({ status: 403, ok: false, body: { message: 'Invalid CSRF token' } }),
        ); // retry still fails — no second retry
      await expect(api.post('/things')).rejects.toBeInstanceOf(ApiError);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Invalid CSRF token');
    });

    it('does not retry on 403 when the body is not valid JSON', async () => {
      const nonJsonResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => {
          throw new Error('not json');
        },
        clone: () => ({
          json: async () => {
            throw new Error('not json');
          },
        }),
      } as unknown as Response;
      fetchSpy.mockResolvedValueOnce(nonJsonResponse);
      await expect(api.get('/things')).rejects.toBeInstanceOf(ApiError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('does not retry on 403 whose body has no message field', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ status: 403, ok: false, body: { error: 'csrf' } }),
      );
      await expect(api.get('/things')).rejects.toBeInstanceOf(ApiError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
