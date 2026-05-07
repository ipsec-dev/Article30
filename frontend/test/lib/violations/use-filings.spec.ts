import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFilings } from '@/lib/violations/use-filings';

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn() } }));

import { api } from '@/lib/api/client';

describe('useFilings', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches both filings and persons-notifications in parallel', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: 'f1' }])
      .mockResolvedValueOnce([{ id: 'p1' }]);
    const { result } = renderHook(() => useFilings('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filings).toEqual([{ id: 'f1' }]);
    expect(result.current.personsNotifications).toEqual([{ id: 'p1' }]);
    expect(api.get).toHaveBeenCalledWith('/violations/v-1/filings');
    expect(api.get).toHaveBeenCalledWith('/violations/v-1/persons-notifications');
  });

  it('captures the first rejection and wraps non-Error throws', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce('weird');
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    const { result } = renderHook(() => useFilings('v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('weird');
  });
});
