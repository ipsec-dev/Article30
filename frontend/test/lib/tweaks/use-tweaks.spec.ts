import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TWEAKS, applyTweaks, readStoredTweaks, useTweaks } from '@/lib/tweaks/use-tweaks';

const STORAGE_KEY = 'article30-tweaks';

// Node 22+ exposes an experimental global `localStorage` that is an empty object
// with no methods, shadowing jsdom's implementation. Provide a proper in-memory
// polyfill so that window.localStorage behaves like the Web Storage API.
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

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-density');
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  window.localStorage.clear();
});

describe('readStoredTweaks', () => {
  it('returns defaults when localStorage is empty', () => {
    expect(readStoredTweaks()).toEqual(DEFAULT_TWEAKS);
  });

  it('returns stored values when valid', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'forest', dark: true, density: 'compact' }),
    );
    expect(readStoredTweaks()).toEqual({
      theme: 'forest',
      dark: true,
      density: 'compact',
    });
  });

  it('falls back to defaults for invalid theme', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'rainbow', dark: true, density: 'compact' }),
    );
    const result = readStoredTweaks();
    expect(result.theme).toBe('ink');
    expect(result.dark).toBe(true);
  });

  it('falls back to defaults for invalid JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not json {{{');
    expect(readStoredTweaks()).toEqual(DEFAULT_TWEAKS);
  });
});

describe('applyTweaks', () => {
  it('sets data-theme on the html root', () => {
    applyTweaks({ theme: 'sand', dark: false, density: 'comfortable' });
    expect(document.documentElement.dataset.theme).toBe('sand');
  });

  it('sets data-density on the html root', () => {
    applyTweaks({ theme: 'ink', dark: false, density: 'compact' });
    expect(document.documentElement.dataset.density).toBe('compact');
  });

  it('toggles the dark class', () => {
    applyTweaks({ theme: 'ink', dark: true, density: 'comfortable' });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyTweaks({ theme: 'ink', dark: false, density: 'comfortable' });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('useTweaks', () => {
  it('hydrates from localStorage on mount and applies to html', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'forest', dark: true, density: 'compact' }),
    );
    const { result } = renderHook(() => useTweaks());
    expect(result.current.tweaks).toEqual({
      theme: 'forest',
      dark: true,
      density: 'compact',
    });
    expect(document.documentElement.dataset.theme).toBe('forest');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.density).toBe('compact');
  });

  it('setTweak persists to localStorage and re-applies to html', () => {
    const { result } = renderHook(() => useTweaks());
    act(() => result.current.setTweak('theme', 'slate'));
    expect(result.current.tweaks.theme).toBe('slate');
    expect(document.documentElement.dataset.theme).toBe('slate');
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.theme).toBe('slate');
  });

  it('setTweak("dark", true) toggles class', () => {
    const { result } = renderHook(() => useTweaks());
    act(() => result.current.setTweak('dark', true));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    act(() => result.current.setTweak('dark', false));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
