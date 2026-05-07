import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useComments } from '@/lib/follow-up/use-comments';

vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

import { api } from '@/lib/api/client';

describe('useComments', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches comments on mount with the entity-scoped path', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 'c1' }]);
    const { result } = renderHook(() => useComments('VIOLATION', 'v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.comments).toEqual([{ id: 'c1' }]);
    expect(api.get).toHaveBeenCalledWith('/follow-up/comments/VIOLATION/v-1');
  });

  it('post defaults visibility to INTERNAL and refreshes', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'c2' }]);
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useComments('DSR', 'd-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.post('hello');
    });
    expect(api.post).toHaveBeenCalledWith('/follow-up/comments', {
      entityType: 'DSR',
      entityId: 'd-1',
      body: 'hello',
      visibility: 'INTERNAL',
    });
    expect(result.current.comments).toEqual([{ id: 'c2' }]);
  });

  it('post forwards an explicit visibility', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    const { result } = renderHook(() => useComments('DSR', 'd-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.post('x', 'AUDITOR_VISIBLE');
    });
    expect(api.post).toHaveBeenCalledWith(
      '/follow-up/comments',
      expect.objectContaining({ visibility: 'AUDITOR_VISIBLE' }),
    );
  });

  it('captures errors and wraps non-Error rejections', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(123);
    const { result } = renderHook(() => useComments('DSR', 'x'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('123');
  });
});
