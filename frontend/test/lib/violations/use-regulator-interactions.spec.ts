import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRegulatorInteractions } from '@/lib/violations/use-regulator-interactions';

vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

import { api } from '@/lib/api/client';

describe('useRegulatorInteractions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches interactions on mount', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 'i1' }]);
    const { result } = renderHook(() => useRegulatorInteractions('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.interactions).toEqual([{ id: 'i1' }]);
    expect(api.get).toHaveBeenCalledWith('/violations/v-1/regulator-interactions');
  });

  it('record posts the input and refreshes', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'i2' }]);
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useRegulatorInteractions('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.record({
        direction: 'OUTBOUND',
        kind: 'FILING_INITIAL',
        occurredAt: '2026-04-30T00:00:00Z',
        summary: 's',
      });
    });
    expect(api.post).toHaveBeenCalledWith(
      '/violations/v-1/regulator-interactions',
      expect.objectContaining({ direction: 'OUTBOUND', kind: 'FILING_INITIAL' }),
    );
    expect(result.current.interactions).toEqual([{ id: 'i2' }]);
  });

  it('captures errors and wraps non-Error rejections', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce('plain');
    const { result } = renderHook(() => useRegulatorInteractions('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('plain');
  });
});
