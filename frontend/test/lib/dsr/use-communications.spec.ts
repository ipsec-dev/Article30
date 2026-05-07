import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCommunications } from '@/lib/dsr/use-communications';

vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

import { api } from '@/lib/api/client';

describe('useCommunications', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches communications on mount', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 'c1' }]);
    const { result } = renderHook(() => useCommunications('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.communications).toEqual([{ id: 'c1' }]);
    expect(api.get).toHaveBeenCalledWith('/dsr/dsr-1/communications');
  });

  it('record posts then refreshes', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'c2' }]);
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useCommunications('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.record({
        kind: 'ACKNOWLEDGEMENT',
        channel: 'EMAIL',
        sentAt: '2026-04-30T00:00:00Z',
      });
    });
    expect(api.post).toHaveBeenCalledWith('/dsr/dsr-1/communications', expect.any(Object));
    expect(result.current.communications).toEqual([{ id: 'c2' }]);
  });

  it('captures fetch errors and wraps non-Error rejections', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce({ code: 500 });
    const { result } = renderHook(() => useCommunications('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
