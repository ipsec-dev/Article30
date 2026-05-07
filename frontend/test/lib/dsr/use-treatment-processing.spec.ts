import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTreatmentProcessing } from '@/lib/dsr/use-treatment-processing';

vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

import { api } from '@/lib/api/client';

describe('useTreatmentProcessing', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches processing logs on mount', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 'l1' }]);
    const { result } = renderHook(() => useTreatmentProcessing('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.processingLogs).toEqual([{ id: 'l1' }]);
    expect(api.get).toHaveBeenCalledWith('/dsr/dsr-1/treatments/processing');
  });

  it('upsert PATCHes the per-treatment endpoint and refreshes', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'l2' }]);
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useTreatmentProcessing('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.upsert('t-7', {
        actionTaken: 'ACCESS_EXPORT',
        vendorPropagationStatus: 'NOT_REQUIRED',
        findingsSummary: 'ok',
      });
    });

    expect(api.patch).toHaveBeenCalledWith('/dsr/dsr-1/treatments/t-7/processing', {
      actionTaken: 'ACCESS_EXPORT',
      vendorPropagationStatus: 'NOT_REQUIRED',
      findingsSummary: 'ok',
    });
    expect(result.current.processingLogs).toEqual([{ id: 'l2' }]);
  });

  it('link POSTs and refreshes', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'l3' }]);
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useTreatmentProcessing('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.link('t-9');
    });
    expect(api.post).toHaveBeenCalledWith('/dsr/dsr-1/treatments/t-9/link');
    expect(result.current.processingLogs).toEqual([{ id: 'l3' }]);
  });

  it('captures errors and wraps non-Error rejections', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce('string err');
    const { result } = renderHook(() => useTreatmentProcessing('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('string err');
  });
});
