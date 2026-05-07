'use client';

import { useFilings } from '@/lib/violations';
import { useI18n } from '@/i18n/context';

export function FilingsPanel({ violationId }: { violationId: string }) {
  const { t } = useI18n();
  const { filings, personsNotifications, loading, error } = useFilings(violationId);

  if (loading)
    return (
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        {t('common.loading')}
      </p>
    );
  if (error)
    return (
      <p className="text-sm text-red-600">
        {t('common.error')}: {error.message}
      </p>
    );

  return (
    <section>
      <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
        {t('violation.filings.cnilTitle')}
      </h3>
      {filings.length === 0 && (
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-3)' }}>
          {t('violation.filings.cnilEmpty')}
        </p>
      )}
      {filings.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {filings.map(f => (
            <li
              key={f.id}
              className="rounded px-3 py-2"
              style={{ border: '1px solid var(--a30-border)' }}
            >
              <span className="font-medium">{f.phase}</span> · {f.channel} ·{' '}
              <span style={{ color: 'var(--ink-3)' }}>{new Date(f.filedAt).toLocaleString()}</span>
              {f.referenceNumber && (
                <span
                  className="ml-2 rounded px-2 py-0.5 text-xs"
                  style={{ background: 'var(--surface-2)' }}
                >
                  {f.referenceNumber}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs" style={{ color: 'var(--ink-3)' }}>
        {t('violation.filings.cnilAutoNote')}
      </p>

      <h3 className="mt-4 text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
        {t('violation.filings.personsTitle')}
      </h3>
      {personsNotifications.length === 0 && (
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-3)' }}>
          {t('violation.filings.personsEmpty')}
        </p>
      )}
      {personsNotifications.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {personsNotifications.map(n => (
            <li
              key={n.id}
              className="rounded px-3 py-2"
              style={{ border: '1px solid var(--a30-border)' }}
            >
              <span className="font-medium">{n.method}</span> ·{' '}
              <span style={{ color: 'var(--ink-3)' }}>
                {new Date(n.notifiedAt).toLocaleString()}
              </span>
              <p className="mt-1 text-xs" style={{ color: 'var(--ink-2)' }}>
                {n.recipientScope}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
