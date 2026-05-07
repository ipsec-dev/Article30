import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDsrDetail } from '@/lib/dsr/use-dsr-detail';

vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}));

import { api } from '@/lib/api/client';

const mockDsr = {
  id: 'dsr-1',
  type: 'ACCESS',
  status: 'RECEIVED',
  requesterName: 'Jane Doe',
  requesterEmail: 'jane@example.com',
  requesterDetails: null,
  identityVerified: false,
  identityNotes: null,
  description: null,
  affectedSystems: null,
  receivedAt: '2026-04-01T00:00:00Z',
  deadline: '2026-05-01T00:00:00Z',
  extendedDeadline: null,
  extensionReason: null,
  responseNotes: null,
  respondedAt: null,
  closedAt: null,
  closureReason: null,
  rejectionReason: null,
  rejectionDetails: null,
  partialFulfilmentNotes: null,
  withdrawnReason: null,
  createdBy: null,
  assignedTo: null,
  creator: null,
  assignee: null,
  treatments: [],
  organizationId: 'org-1',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

describe('useDsrDetail', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches DSR on mount and exposes the data', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDsr);
    const { result } = renderHook(() => useDsrDetail('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dsr?.id).toBe('dsr-1');
    expect(result.current.dsr?.status).toBe('RECEIVED');
    expect(api.get).toHaveBeenCalledWith('/dsr/dsr-1');
  });

  it('calls transition endpoint with target and payload, then refreshes', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockDsr)
      .mockResolvedValueOnce({ ...mockDsr, status: 'ACKNOWLEDGED' });
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDsrDetail('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.transition('ACKNOWLEDGED', {});

    expect(api.patch).toHaveBeenCalledWith('/dsr/dsr-1/transition', {
      target: 'ACKNOWLEDGED',
      payload: {},
    });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2)); // initial + after transition
    await waitFor(() => expect(result.current.dsr?.status).toBe('ACKNOWLEDGED'));
  });

  it('captures fetch errors', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHook(() => useDsrDetail('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('network error');
    expect(result.current.dsr).toBeNull();
  });

  it('exposes refresh method that re-fetches the DSR', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockDsr)
      .mockResolvedValueOnce({ ...mockDsr, updatedAt: '2026-04-26T00:00:00Z' });

    const { result } = renderHook(() => useDsrDetail('dsr-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.refresh();
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
