'use client';

import { useCallback } from 'react';
import { useI18n } from '@/i18n/context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LanguageCard() {
  const { t, locale, setLocale } = useI18n();
  const handleSetFr = useCallback(() => setLocale('fr'), [setLocale]);
  const handleSetEn = useCallback(() => setLocale('en'), [setLocale]);

  const baseClass = 'rounded px-3 py-1.5 text-sm font-medium transition-colors';
  const styleFor = (active: boolean) =>
    active
      ? { background: 'var(--primary)', color: 'var(--primary-fg)' }
      : { background: 'var(--surface-2)', color: 'var(--ink-2)' };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.language.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm" style={{ color: 'var(--ink-2)' }}>
          {t('settings.language.description')}
        </p>
        <div className="flex gap-2">
          <button onClick={handleSetFr} className={baseClass} style={styleFor(locale === 'fr')}>
            Français
          </button>
          <button onClick={handleSetEn} className={baseClass} style={styleFor(locale === 'en')}>
            English
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
