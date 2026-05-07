'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api/client';

interface ServerConfig {
  smtpEnabled: boolean;
  bootstrapAvailable: boolean;
  version: string;
}

const ConfigContext = createContext<ServerConfig | null>(null);

// smtpEnabled defaults to `true` because enabled is the common/feature-on state.
// bootstrapAvailable defaults to `false` because post-bootstrap is the common state;
// flashing a "Create account" link on a fresh tab would be worse than the fresh-DB
// "link appears after fetch" flash.
// version defaults to '' because we don't know it until the server responds; consumers
// should treat empty as "unknown/loading" rather than rendering it.
const OPTIMISTIC_DEFAULT: ServerConfig = {
  smtpEnabled: true,
  bootstrapAvailable: false,
  version: '',
};

export function ConfigProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [config, setConfig] = useState<ServerConfig>(OPTIMISTIC_DEFAULT);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ServerConfig>('/config')
      .then(next => {
        if (!cancelled) {
          setConfig(next);
        }
      })
      .catch(() => {
        // Fail-open for smtpEnabled (keeps true). bootstrapAvailable stays false —
        // refusing to reveal a bootstrap opportunity when we can't confirm the DB is
        // empty is the safer default.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useServerConfig(): ServerConfig {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error('useServerConfig must be used within ConfigProvider');
  }
  return ctx;
}
