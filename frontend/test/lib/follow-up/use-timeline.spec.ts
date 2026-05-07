import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTimeline } from '@/lib/follow-up/use-timeline';

vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn() },
}));

import { api } from '@/lib/api/client';

describe('useTimeline', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches events on mount and exposes them', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: 'e1',
        organizationId: 'org-a',
        entityType: 'VIOLATION',
        entityId: 'v1',
        kind: 'COMMENT',
        payload: {},
        performedBy: 'u1',
        performedAt: '2026-04-26T00:00:00Z',
      },
    ]);
    const { result } = renderHook(() => useTimeline('VIOLATION', 'v1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].kind).toBe('COMMENT');
    expect(api.get).toHaveBeenCalledWith('/follow-up/timeline/VIOLATION/v1');
  });

  it('captures errors', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useTimeline('DSR', 'd1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.events).toEqual([]);
  });

  it('refresh re-fetches', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'e2',
        organizationId: 'org-a',
        entityType: 'VIOLATION',
        entityId: 'v1',
        kind: 'STATUS_CHANGE',
        payload: {},
        performedBy: null,
        performedAt: '2026-04-26T01:00:00Z',
      },
    ]);
    const { result } = renderHook(() => useTimeline('VIOLATION', 'v1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events).toEqual([]);
    await result.current.refresh();
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
