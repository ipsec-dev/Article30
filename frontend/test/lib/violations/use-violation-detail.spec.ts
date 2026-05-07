import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useViolationDetail } from '@/lib/violations/use-violation-detail';

vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}));

import { api } from '@/lib/api/client';

describe('useViolationDetail', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches the violation on mount', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'v-1', status: 'RECEIVED' });
    const { result } = renderHook(() => useViolationDetail('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.violation?.id).toBe('v-1');
    expect(api.get).toHaveBeenCalledWith('/violations/v-1');
  });

  it('captures errors and wraps non-Error rejections', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce('plain');
    const { result } = renderHook(() => useViolationDetail('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('plain');
  });

  it('transition PATCHes target+payload and refreshes', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 'v-1', status: 'RECEIVED' })
      .mockResolvedValueOnce({ id: 'v-1', status: 'TRIAGED' });
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useViolationDetail('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.transition('TRIAGED', { reason: 'r' });
    });
    expect(api.patch).toHaveBeenCalledWith('/violations/v-1/transition', {
      target: 'TRIAGED',
      payload: { reason: 'r' },
    });
    expect(result.current.violation?.status).toBe('TRIAGED');
  });

  it('transition defaults the payload to an empty object when omitted', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'v-1', status: 'RECEIVED' });
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'v-1', status: 'CLOSED' });
    const { result } = renderHook(() => useViolationDetail('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.transition('CLOSED');
    });
    expect(api.patch).toHaveBeenCalledWith('/violations/v-1/transition', {
      target: 'CLOSED',
      payload: {},
    });
  });
});
