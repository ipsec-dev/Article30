import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSidebarCollapsed } from '@/lib/sidebar/use-sidebar-collapsed';

const STORAGE_KEY = 'article30-sidebar-collapsed';

// Provide a proper in-memory localStorage polyfill, consistent with the tweaks spec.
{
  const _store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null),
    setItem: (k: string, v: string) => {
      _store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete _store[k];
    },
    clear: () => {
      Object.keys(_store).forEach(k => delete _store[k]);
    },
    get length() {
      return Object.keys(_store).length;
    },
    key: (i: number) => Object.keys(_store)[i] ?? null,
  });
}

function dispatchStorageEvent(key: string, newValue: string | null): void {
  // Use a plain Event with patched fields rather than `new StorageEvent(type, init)`.
  // CodeQL flags the StorageEventInit form as "superfluous trailing arguments" against
  // its DOM model, and the patched fields are sufficient for the cross-tab listener.
  const event = new Event('storage');
  Object.defineProperty(event, 'key', { value: key, configurable: true });
  Object.defineProperty(event, 'newValue', { value: newValue, configurable: true });
  window.dispatchEvent(event);
}

beforeEach(() => {
  window.localStorage.clear();
  // Reset the CSS variable between tests
  document.documentElement.style.removeProperty('--sidebar-width');
});

afterEach(() => {
  window.localStorage.clear();
});

describe('useSidebarCollapsed', () => {
  it('defaults to expanded (collapsed = false) when localStorage is empty', () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.collapsed).toBe(false);
  });

  it('hydrates collapsed=true from localStorage on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.collapsed).toBe(true);
  });

  it('hydrates collapsed=false from localStorage on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, 'false');
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.collapsed).toBe(false);
  });

  it('toggle flips collapsed state and writes to localStorage', () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.collapsed).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false');
  });

  it('sets --sidebar-width CSS variable to 56px when collapsed', () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    act(() => result.current.toggle());
    expect(document.documentElement.style.getPropertyValue('--sidebar-width')).toBe('56px');
  });

  it('sets --sidebar-width CSS variable to 232px when expanded', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useSidebarCollapsed());
    // starts collapsed, toggle back to expanded
    act(() => result.current.toggle());
    expect(document.documentElement.style.getPropertyValue('--sidebar-width')).toBe('232px');
  });

  it('syncs state from a storage event emitted by another tab', () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.collapsed).toBe(false);

    act(() => {
      // Simulate a cross-tab storage write
      dispatchStorageEvent(STORAGE_KEY, 'true');
    });

    expect(result.current.collapsed).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--sidebar-width')).toBe('56px');
  });

  it('ignores storage events for unrelated keys', () => {
    const { result } = renderHook(() => useSidebarCollapsed());

    act(() => {
      dispatchStorageEvent('some-other-key', 'true');
    });

    // Must remain at default
    expect(result.current.collapsed).toBe(false);
  });
});
