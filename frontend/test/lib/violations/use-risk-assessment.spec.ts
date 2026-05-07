import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRiskAssessment } from '@/lib/violations/use-risk-assessment';

vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

import { api } from '@/lib/api/client';

describe('useRiskAssessment', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches current + history on mount', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 'r1',
        likelihood: 'HIGH',
        severity: 'HIGH',
        computedRiskLevel: 'HIGH',
        affectedDataCategories: [],
        estimatedSubjectCount: null,
        estimatedRecordCount: null,
        crossBorder: false,
        potentialConsequences: 'x',
        mitigatingFactors: null,
        assessedBy: 'u1',
        assessedAt: '2026-04-26T00:00:00Z',
        supersedesId: null,
        violationId: 'v1',
      })
      .mockResolvedValueOnce([]);
    const { result } = renderHook(() => useRiskAssessment('v1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.current?.likelihood).toBe('HIGH');
    expect(api.get).toHaveBeenCalledWith('/violations/v1/risk-assessment');
    expect(api.get).toHaveBeenCalledWith('/violations/v1/risk-assessment/history');
  });

  it('create posts and refreshes', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([])
      // After create, refresh fetches again:
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([]);
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const { result } = renderHook(() => useRiskAssessment('v1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.create({
      likelihood: 'LOW',
      severity: 'LOW',
      affectedDataCategories: [],
      crossBorder: false,
      potentialConsequences: 'fresh assessment',
    });
    expect(api.post).toHaveBeenCalledWith(
      '/violations/v1/risk-assessment',
      expect.objectContaining({
        likelihood: 'LOW',
        severity: 'LOW',
      }),
    );
    expect(api.get).toHaveBeenCalledTimes(4); // 2 mount + 2 refresh
  });

  it('captures errors', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useRiskAssessment('v1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('boom');
  });
});
