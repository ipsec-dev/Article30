'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeName = 'ink' | 'forest' | 'sand' | 'slate';
export type DensityName = 'comfortable' | 'compact';

export interface Tweaks {
  theme: ThemeName;
  dark: boolean;
  density: DensityName;
}

const STORAGE_KEY = 'article30-tweaks';

export const DEFAULT_TWEAKS: Tweaks = {
  theme: 'ink',
  dark: false,
  density: 'comfortable',
};

const VALID_THEMES: ThemeName[] = ['ink', 'forest', 'sand', 'slate'];
const VALID_DENSITIES: DensityName[] = ['comfortable', 'compact'];

function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (VALID_THEMES as string[]).includes(value);
}

function isDensityName(value: unknown): value is DensityName {
  return typeof value === 'string' && (VALID_DENSITIES as string[]).includes(value);
}

export function readStoredTweaks(): Tweaks {
  if (typeof window === 'undefined') return DEFAULT_TWEAKS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TWEAKS;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_TWEAKS;
    const obj = parsed as Record<string, unknown>;
    return {
      theme: isThemeName(obj.theme) ? obj.theme : DEFAULT_TWEAKS.theme,
      dark: typeof obj.dark === 'boolean' ? obj.dark : DEFAULT_TWEAKS.dark,
      density: isDensityName(obj.density) ? obj.density : DEFAULT_TWEAKS.density,
    };
  } catch {
    return DEFAULT_TWEAKS;
  }
}

export function applyTweaks(tweaks: Tweaks) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = tweaks.theme;
  root.dataset.density = tweaks.density;
  root.classList.toggle('dark', tweaks.dark);
}

export function useTweaks() {
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULT_TWEAKS);

  // Hydrate from localStorage and apply to <html>
  useEffect(() => {
    const stored = readStoredTweaks();
    setTweaks(stored);
    applyTweaks(stored);
  }, []);

  // Sync prefs when changed in another tab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = readStoredTweaks();
      setTweaks(next);
      applyTweaks(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTweak = useCallback(<K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
    setTweaks(prev => {
      const next = { ...prev, [key]: value };
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch {
        // localStorage unavailable — skip persistence
      }
      applyTweaks(next);
      return next;
    });
  }, []);

  return { tweaks, setTweak };
}
