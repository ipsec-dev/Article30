import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAttachments } from '@/lib/follow-up/use-attachments';

vi.mock('@/lib/api/client', () => ({ api: { get: vi.fn() } }));

import { api } from '@/lib/api/client';

describe('useAttachments', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // JSDOM's document.cookie='' does NOT clear cookies — explicitly expire any
    // XSRF token left by a previous test.
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the entity-scoped list on mount', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 'a1' }]);
    const { result } = renderHook(() => useAttachments('VIOLATION', 'v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.attachments).toEqual([{ id: 'a1' }]);
    expect(api.get).toHaveBeenCalledWith('/follow-up/attachments/VIOLATION/v-1');
  });

  it('captures errors and wraps non-Error rejections', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce({ status: 500 });
    const { result } = renderHook(() => useAttachments('DSR', 'd-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('upload posts multipart with the XSRF token from cookie and refreshes', async () => {
    document.cookie = 'XSRF-TOKEN=abc%3D';
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'a2' }]);
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
    } as Response);

    const { result } = renderHook(() => useAttachments('VIOLATION', 'v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const file = new File(['hi'], 'note.txt', { type: 'text/plain' });
    await act(async () => {
      await result.current.upload(file, 'EVIDENCE');
    });

    const call = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('/api/follow-up/attachments');
    expect(call[1].method).toBe('POST');
    expect(call[1].headers['x-xsrf-token']).toBe('abc=');
    expect(result.current.attachments).toEqual([{ id: 'a2' }]);
  });

  it('upload throws when fetch responds with !ok', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 413,
    } as Response);
    const { result } = renderHook(() => useAttachments('VIOLATION', 'v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const file = new File(['x'], 'big.bin');
    await expect(
      act(async () => {
        await result.current.upload(file, 'X');
      }),
    ).rejects.toThrow(/Upload failed: 413/);
  });

  it('upload uses an empty XSRF token when the cookie is missing', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
    } as Response);
    const { result } = renderHook(() => useAttachments('VIOLATION', 'v-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const file = new File(['x'], 'a.txt');
    await act(async () => {
      await result.current.upload(file, 'X');
    });
    const call = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers['x-xsrf-token']).toBe('');
  });

  it('downloadUrl returns the conventional path', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    const { result } = renderHook(() => useAttachments('DSR', 'd-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.downloadUrl('att-9')).toBe('/api/follow-up/attachments/att-9/download');
  });
});
