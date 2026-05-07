import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useActionItems } from '@/lib/violations/use-action-items';

vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import { api } from '@/lib/api/client';

describe('useActionItems', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches action items on mount', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 'a1' }]);
    const { result } = renderHook(() => useActionItems('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([{ id: 'a1' }]);
    expect(api.get).toHaveBeenCalledWith('/violations/v-1/action-items');
  });

  it('captures errors and wraps non-Error rejections', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce('plain');
    const { result } = renderHook(() => useActionItems('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('plain');
  });

  it('create POSTs the input and refreshes', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'a2' }]);
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useActionItems('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.create({
        title: 't',
        ownerId: 'u-1',
        deadline: '2026-05-01T00:00:00Z',
      });
    });
    expect(api.post).toHaveBeenCalledWith(
      '/violations/v-1/action-items',
      expect.objectContaining({ title: 't' }),
    );
    expect(result.current.items).toEqual([{ id: 'a2' }]);
  });

  it('update PATCHes the per-item endpoint and refreshes', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'a3' }]);
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useActionItems('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.update('a-7', { status: 'DONE' });
    });
    expect(api.patch).toHaveBeenCalledWith('/violations/v-1/action-items/a-7', { status: 'DONE' });
    expect(result.current.items).toEqual([{ id: 'a3' }]);
  });
});
