import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { getMe, login, logout, signup } from '@/lib/auth';

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: apiMock };
});

describe('lib/auth', () => {
  beforeEach(() => {
    Object.values(apiMock).forEach(fn => fn.mockReset());
  });

  describe('getMe', () => {
    it('returns the user when /auth/me succeeds', async () => {
      apiMock.get.mockResolvedValue({ id: 'u1', email: 'a@b.test', role: 'DPO' });
      const me = await getMe();
      expect(me).toEqual({ id: 'u1', email: 'a@b.test', role: 'DPO' });
      expect(apiMock.get).toHaveBeenCalledWith('/auth/me');
    });

    it('returns null when /auth/me throws (logged-out state)', async () => {
      apiMock.get.mockRejectedValue(new ApiError(401, 'unauth'));
      const me = await getMe();
      expect(me).toBeNull();
    });

    it('returns null when /auth/me rejects with a non-Error value', async () => {
      apiMock.get.mockRejectedValue('raw-string');
      const me = await getMe();
      expect(me).toBeNull();
    });
  });

  describe('login', () => {
    it('POSTs the credentials and returns the user', async () => {
      apiMock.post.mockResolvedValue({ id: 'u1', email: 'a@b.test' });
      const res = await login('a@b.test', 'secret');
      expect(apiMock.post).toHaveBeenCalledWith('/auth/login', {
        email: 'a@b.test',
        password: 'secret',
      });
      expect(res).toEqual({ id: 'u1', email: 'a@b.test' });
    });
  });

  describe('signup', () => {
    it('POSTs firstName/lastName/email/password and returns the user', async () => {
      apiMock.post.mockResolvedValue({ id: 'u1' });
      await signup('Alice', 'Smith', 'a@b.test', 'secret12');
      expect(apiMock.post).toHaveBeenCalledWith('/auth/signup', {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'a@b.test',
        password: 'secret12',
      });
    });
  });

  describe('logout', () => {
    it('POSTs to /auth/logout with no body', async () => {
      apiMock.post.mockResolvedValue(undefined);
      await logout();
      expect(apiMock.post).toHaveBeenCalledWith('/auth/logout');
    });
  });
});
