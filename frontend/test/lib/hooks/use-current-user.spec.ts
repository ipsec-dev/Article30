import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';

vi.mock('@/lib/auth', () => ({ getMe: vi.fn() }));

import { getMe } from '@/lib/auth';

const mockUser = {
  id: 'u1',
  name: 'Camille',
  email: 'c@example.com',
  role: 'DPO',
  approved: true,
};

describe('useCurrentUser', () => {
  beforeEach(() => vi.resetAllMocks());

  it('starts in loading state and resolves with the user', async () => {
    (getMe as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);
    const { result } = renderHook(() => useCurrentUser());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(mockUser);
  });

  it('does not setState after unmount (active=false guard)', async () => {
    let resolve: (v: typeof mockUser) => void = () => {};
    (getMe as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise<typeof mockUser>(r => (resolve = r)),
    );
    const { result, unmount } = renderHook(() => useCurrentUser());
    unmount();
    resolve(mockUser);
    await Promise.resolve();
    await Promise.resolve();
    expect(result.current.user).toBeNull();
  });
});
