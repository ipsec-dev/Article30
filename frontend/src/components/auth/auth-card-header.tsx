'use client';

import { CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n/context';

interface AuthCardHeaderProps {
  subtitleKey: string;
}

export function AuthCardHeader({ subtitleKey }: Readonly<AuthCardHeaderProps>) {
  const { t } = useI18n();
  return (
    <CardHeader className="space-y-1 text-center">
      <p className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--primary-600)' }}>
        {t('app.title')}
      </p>
      <CardTitle className="text-base font-normal" style={{ color: 'var(--ink-3)' }}>
        {t(subtitleKey)}
      </CardTitle>
    </CardHeader>
  );
}
