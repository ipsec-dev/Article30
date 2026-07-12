'use client';

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import fr from './fr.json';
import en from './en.json';

type Locale = 'fr' | 'en';
type Translations = Record<string, string>;

const translations: Record<Locale, Translations> = { fr, en };
const STORAGE_KEY = 'article30-locale';
const VALID_LOCALES: ReadonlyArray<Locale> = ['fr', 'en'];
const DEFAULT_LOCALE: Locale = 'fr';

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (VALID_LOCALES as readonly string[]).includes(value);
}

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

// External store for the active locale, backed by localStorage. Using
// useSyncExternalStore (rather than useEffect(setState, [])) lets the server
// render the default while the client subscribes to the stored value in a
// single commit — no post-mount re-render flicker. `cachedLocale` also keeps
// the last choice in memory so the preference survives a session where
// localStorage writes throw (e.g. private browsing).
let cachedLocale: Locale | null = null;
const localeListeners = new Set<() => void>();

function getLocaleSnapshot(): Locale {
  if (cachedLocale === null) {
    cachedLocale = readStoredLocale();
  }
  return cachedLocale;
}

function getServerLocaleSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function writeLocale(next: Locale): void {
  cachedLocale = next;
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  } catch {
    // localStorage unavailable — preference is tab-only this session.
  }
  for (const listener of localeListeners) listener();
}

function subscribeLocale(onStoreChange: () => void): () => void {
  localeListeners.add(onStoreChange);
  // Cross-tab sync: another tab writing the key refreshes the cache here.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cachedLocale = readStoredLocale();
    onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    localeListeners.delete(onStoreChange);
    window.removeEventListener('storage', onStorage);
  };
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: Readonly<{ children: ReactNode }>) {
  const locale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getServerLocaleSnapshot);

  const setLocale = useCallback((next: Locale) => {
    writeLocale(next);
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
