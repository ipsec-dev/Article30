'use client';

import { useState } from 'react';
import { useRegulatorInteractions, type RegulatorInteraction } from '@/lib/violations';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n/context';

const KINDS = [
  'FILING_INITIAL',
  'FILING_COMPLEMENTARY',
  'RFI_RECEIVED',
  'RFI_RESPONDED',
  'CLOSURE_NOTICE',
  'SANCTION_NOTICE',
  'OTHER',
] as const;

export function RegulatorPanel({ violationId }: { violationId: string }) {
  const { t } = useI18n();
  const { interactions, loading, error, record } = useRegulatorInteractions(violationId);
  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState<RegulatorInteraction['direction']>('OUTBOUND');
  const [kind, setKind] = useState<RegulatorInteraction['kind']>('OTHER');
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [referenceNumber, setRef] = useState('');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await record({
        direction,
        kind,
        occurredAt: new Date(occurredAt).toISOString(),
        referenceNumber: referenceNumber || undefined,
        summary,
      });
      setShowForm(false);
      setSummary('');
      setRef('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
        {t('violation.regulator.title')}
      </h3>
      {interactions.length === 0 && (
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-3)' }}>
          {t('violation.regulator.empty')}
        </p>
      )}
      {interactions.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {interactions.map(i => (
            <li
              key={i.id}
              className="rounded px-3 py-2"
              style={{ border: '1px solid var(--a30-border)' }}
            >
              <span className="font-medium">{i.direction}</span> · {i.kind} ·{' '}
              <span style={{ color: 'var(--ink-3)' }}>
                {new Date(i.occurredAt).toLocaleString()}
              </span>
              <p className="mt-1 whitespace-pre-wrap text-xs" style={{ color: 'var(--ink-2)' }}>
                {i.summary}
              </p>
            </li>
          ))}
        </ul>
      )}
      {!showForm && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => setShowForm(true)}
        >
          {t('violation.regulator.recordButton')}
        </Button>
      )}
      {showForm && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t('violation.regulator.direction')}</Label>
              <select
                aria-label="direction"
                className="block w-full rounded px-2 py-1 text-sm"
                style={{ border: '1px solid var(--a30-border)' }}
                value={direction}
                onChange={e => setDirection(e.target.value as RegulatorInteraction['direction'])}
              >
                <option value="OUTBOUND">{t('violation.regulator.direction.OUTBOUND')}</option>
                <option value="INBOUND">{t('violation.regulator.direction.INBOUND')}</option>
              </select>
            </div>
            <div>
              <Label>{t('violation.regulator.kind')}</Label>
              <select
                aria-label="kind"
                className="block w-full rounded px-2 py-1 text-sm"
                style={{ border: '1px solid var(--a30-border)' }}
                value={kind}
                onChange={e => setKind(e.target.value as RegulatorInteraction['kind'])}
              >
                {KINDS.map(k => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="occurredAt">{t('violation.regulator.when')}</Label>
            <Input
              id="occurredAt"
              type="datetime-local"
              value={occurredAt}
              onChange={e => setOccurredAt(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="referenceNumber">{t('violation.regulator.referenceNumber')}</Label>
            <Input
              id="referenceNumber"
              value={referenceNumber}
              onChange={e => setRef(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="summary">{t('violation.regulator.summary')}</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              required
              minLength={5}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={submitting || summary.length < 5}>
              {submitting ? t('common.saving') : t('violation.regulator.saveInteraction')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
