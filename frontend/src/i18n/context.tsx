'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import fr from './fr.json';
import en from './en.json';

type Locale = 'fr' | 'en';
type Translations = Record<string, string>;

const translations: Record<Locale, Translations> = { fr, en };
const STORAGE_KEY = 'article30-locale';
const VALID_LOCALES: ReadonlyArray<Locale> = ['fr', 'en'];

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (VALID_LOCALES as readonly string[]).includes(value);
}

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'fr';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(raw) ? raw : 'fr';
  } catch {
    return 'fr';
  }
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  // Hydrate from localStorage after mount (SSR-safe).
  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  // Cross-tab sync: pick up changes made in another tab.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setLocaleState(readStoredLocale());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // localStorage unavailable — preference is tab-only this session.
    }
  }, []);

  const t = useCallback((key: string) => translations[locale][key] ?? key, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
