'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { logout } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { AuthCardHeader } from '@/components/auth/auth-card-header';

export default function PendingPage() {
  const { t } = useI18n();
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [router]);

  return (
    <Card className="a30-card">
      <AuthCardHeader subtitleKey="common.pending" />
      <CardContent>
        <p style={{ color: 'var(--ink-2)' }}>{t('auth.pending')}</p>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={handleLogout}
          className="w-full"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          {t('nav.logout')}
        </Button>
      </CardFooter>
    </Card>
  );
}
