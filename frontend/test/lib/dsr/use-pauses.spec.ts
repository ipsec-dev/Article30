import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePauses } from '@/lib/dsr/use-pauses';

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn() } }));

import { api } from '@/lib/api/client';

describe('usePauses', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches pauses on mount', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 'p1' }]);
    const { result } = renderHook(() => usePauses('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pauses).toEqual([{ id: 'p1' }]);
    expect(api.get).toHaveBeenCalledWith('/dsr/dsr-1/pauses');
  });

  it('captures Error instances', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(() => usePauses('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('nope');
  });

  it('wraps non-Error throws into an Error', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce('plain string');
    const { result } = renderHook(() => usePauses('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('plain string');
  });

  it('refresh re-fetches', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'p2' }]);
    const { result } = renderHook(() => usePauses('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.pauses).toEqual([{ id: 'p2' }]);
  });
});
