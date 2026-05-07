import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFetch } from '@/lib/hooks/use-fetch';

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn() } }));

import { api } from '@/lib/api/client';

describe('useFetch', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches on mount and exposes data', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 1 });
    const { result } = renderHook(() => useFetch<{ id: number }>('/widgets/1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ id: 1 });
    expect(api.get).toHaveBeenCalledWith('/widgets/1');
  });

  it('skips fetching when path is null and stays not-loading', async () => {
    const { result } = renderHook(() => useFetch('/x'));
    // Mount triggers a fetch, but path=null branch is the one we want.
    const { result: r2 } = renderHook(() => useFetch<unknown>(null));
    expect(r2.current.loading).toBe(false);
    expect(r2.current.data).toBeNull();
    expect(api.get).not.toHaveBeenCalledWith(null);
    // sanity: the other one ran
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('swallows errors silently and leaves data null', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useFetch('/widgets/1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it('refetch re-issues the GET', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 });
    const { result } = renderHook(() => useFetch<{ v: number }>('/x'));
    await waitFor(() => expect(result.current.data?.v).toBe(1));
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.data?.v).toBe(2);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('refetch is a no-op when path is null', async () => {
    const { result } = renderHook(() => useFetch<unknown>(null));
    await act(async () => {
      await result.current.refetch();
    });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('setData lets caller override after a mutation', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ v: 1 });
    const { result } = renderHook(() => useFetch<{ v: number }>('/x'));
    await waitFor(() => expect(result.current.data?.v).toBe(1));
    act(() => result.current.setData({ v: 42 }));
    expect(result.current.data?.v).toBe(42);
  });
});
