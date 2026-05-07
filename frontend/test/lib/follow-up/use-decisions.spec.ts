import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useDecisions } from '@/lib/follow-up/use-decisions';

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn() } }));

import { api } from '@/lib/api/client';

describe('useDecisions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches decisions on mount', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 'd1' }]);
    const { result } = renderHook(() => useDecisions('VIOLATION', 'v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.decisions).toEqual([{ id: 'd1' }]);
    expect(api.get).toHaveBeenCalledWith('/follow-up/decisions/VIOLATION/v-1');
  });

  it('captures Error rejections', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() => useDecisions('VIOLATION', 'v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('x');
  });

  it('wraps non-Error rejections (the line-40 fallback branch)', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce('plain');
    const { result } = renderHook(() => useDecisions('DSR', 'd-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('plain');
  });

  it('refresh re-fetches', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'd2' }]);
    const { result } = renderHook(() => useDecisions('VIOLATION', 'v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.decisions).toEqual([{ id: 'd2' }]);
  });
});
