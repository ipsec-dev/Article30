'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'article30-sidebar-collapsed';

const SIDEBAR_EXPANDED_WIDTH = '232px';
const SIDEBAR_COLLAPSED_WIDTH = '56px';

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

function applySidebarWidth(collapsed: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(
    '--sidebar-width',
    collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
  );
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from localStorage and apply CSS variable
  useEffect(() => {
    const stored = readCollapsed();
    setCollapsed(stored);
    applySidebarWidth(stored);
  }, []);

  // Cross-tab sync via the storage event
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue === 'true';
      setCollapsed(next);
      applySidebarWidth(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
        }
      } catch {
        // localStorage unavailable — skip persistence
      }
      applySidebarWidth(next);
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
