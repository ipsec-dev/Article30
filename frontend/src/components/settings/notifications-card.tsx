'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Settings {
  notifyDsrDeadline: boolean;
  notifyVendorDpaExpiry: boolean;
  notifyTreatmentReview: boolean;
  notifyViolation72h: boolean;
}

const SETTINGS_ENDPOINT = '/organization/settings';

const TOGGLES: ReadonlyArray<{
  key: keyof Settings;
  labelKey: string;
  helpKey: string;
}> = [
  {
    key: 'notifyDsrDeadline',
    labelKey: 'settings.notifications.dsrDeadline.label',
    helpKey: 'settings.notifications.dsrDeadline.help',
  },
  {
    key: 'notifyVendorDpaExpiry',
    labelKey: 'settings.notifications.vendorDpaExpiry.label',
    helpKey: 'settings.notifications.vendorDpaExpiry.help',
  },
  {
    key: 'notifyTreatmentReview',
    labelKey: 'settings.notifications.treatmentReview.label',
    helpKey: 'settings.notifications.treatmentReview.help',
  },
  {
    key: 'notifyViolation72h',
    labelKey: 'settings.notifications.violation72h.label',
    helpKey: 'settings.notifications.violation72h.help',
  },
];

export function NotificationsCard() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Settings>(SETTINGS_ENDPOINT)
      .then(data => {
        if (!cancelled) {
          setSettings(data);
        }
      })
      .catch(() => {
        /* surface via toast in api client; card stays in disabled state */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = (key: keyof Settings) => async (next: boolean) => {
    // Capture the pre-flip value so a failed PATCH rolls back to the actual
    // previous state, not to the inverse of `next` — under rapid double-clicks
    // those two values can diverge.
    let previousValue: boolean | undefined;
    setSettings(prev => {
      if (!prev) return prev;
      previousValue = prev[key];
      return { ...prev, [key]: next };
    });
    try {
      await api.patch(SETTINGS_ENDPOINT, { [key]: next });
    } catch {
      // api client already surfaces the error via toast; just roll back.
      if (previousValue !== undefined) {
        const restored = previousValue;
        setSettings(prev => (prev ? { ...prev, [key]: restored } : prev));
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.notifications.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm" style={{ color: 'var(--ink-2)' }}>
          {t('settings.notifications.description')}
        </p>
        <div className="space-y-3">
          {TOGGLES.map(({ key, labelKey, helpKey }) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor={key}>{t(labelKey)}</Label>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-3)' }}>
                  {t(helpKey)}
                </p>
              </div>
              <Switch
                id={key}
                checked={settings?.[key] ?? false}
                disabled={settings === null}
                onCheckedChange={handleToggle(key)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
