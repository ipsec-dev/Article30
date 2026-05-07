'use client';

import { useEffect, useState } from 'react';
import { getMe } from '@/lib/auth';
import type { UserDto } from '@article30/shared';

interface UseCurrentUser {
  user: UserDto | null;
  loading: boolean;
}

/**
 * Fetches the current session user once on mount. Used by detail pages and
 * any UI that needs to gate rendering on role.
 */
export function useCurrentUser(): UseCurrentUser {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMe()
      .then(u => {
        if (active) {
          setUser(u);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
}
