import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ConfigProvider, useServerConfig } from '@/lib/config/context';

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn() } }));

import { api } from '@/lib/api/client';

describe('ConfigProvider / useServerConfig', () => {
  beforeEach(() => vi.resetAllMocks());

  it('starts with the optimistic defaults and replaces them after fetch', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      smtpEnabled: false,
      bootstrapAvailable: true,
      version: '1.2.3',
    });
    const { result } = renderHook(() => useServerConfig(), {
      wrapper: ({ children }) => <ConfigProvider>{children}</ConfigProvider>,
    });
    expect(result.current).toEqual({ smtpEnabled: true, bootstrapAvailable: false, version: '' });
    await waitFor(() =>
      expect(result.current).toEqual({
        smtpEnabled: false,
        bootstrapAvailable: true,
        version: '1.2.3',
      }),
    );
    expect(api.get).toHaveBeenCalledWith('/config');
  });

  it('keeps the optimistic defaults when /config rejects (fail-open)', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('502'));
    const { result } = renderHook(() => useServerConfig(), {
      wrapper: ({ children }) => <ConfigProvider>{children}</ConfigProvider>,
    });
    // Wait a tick for the rejection to flush.
    await new Promise(r => setTimeout(r, 0));
    expect(result.current).toEqual({ smtpEnabled: true, bootstrapAvailable: false, version: '' });
  });

  it('throws when used outside the provider', () => {
    // useServerConfig calls useContext and asserts a non-null value.
    expect(() => renderHook(() => useServerConfig())).toThrow(/must be used within ConfigProvider/);
  });
});
