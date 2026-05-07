'use client';

import { useState } from 'react';
import { useCommunications } from '@/lib/dsr/use-communications';
import type { RequesterCommunicationKind, RequesterCommunicationChannel } from '@/lib/dsr/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/i18n/context';

interface CommunicationsPanelProps {
  dsrId: string;
}

const KIND_LABELS: Record<RequesterCommunicationKind, string> = {
  ACKNOWLEDGEMENT: 'Acknowledgement',
  EXTENSION_NOTICE: 'Extension notice',
  CLARIFICATION_REQUEST: 'Clarification request',
  RESPONSE: 'Response',
  REJECTION: 'Rejection',
  WITHDRAWAL_CONFIRMATION: 'Withdrawal confirmation',
};

const CHANNEL_LABELS: Record<RequesterCommunicationChannel, string> = {
  EMAIL: 'Email',
  POSTAL: 'Postal',
  IN_PERSON: 'In person',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function CommunicationsPanel({ dsrId }: CommunicationsPanelProps) {
  const { t } = useI18n();
  const { communications, loading, error, record } = useCommunications(dsrId);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<RequesterCommunicationKind>('ACKNOWLEDGEMENT');
  const [channel, setChannel] = useState<RequesterCommunicationChannel>('EMAIL');
  const [sentAt, setSentAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    setSubmitError(null);
    try {
      await record({
        kind,
        channel,
        sentAt: new Date(sentAt).toISOString(),
      });
      setShowForm(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
          Communications
        </h3>
        {!showForm && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)}>
            Record communication
          </Button>
        )}
      </div>

      {communications.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
          No communications recorded.
        </p>
      )}

      {communications.length > 0 && (
        <ul className="space-y-2">
          {communications.map(comm => (
            <li
              key={comm.id}
              className="rounded px-3 py-2 text-sm"
              style={{ border: '1px solid var(--a30-border)' }}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ color: 'var(--ink-2)' }}>
                  {KIND_LABELS[comm.kind] ?? comm.kind}
                </span>
                <span style={{ color: 'var(--ink-3)' }}>·</span>
                <span style={{ color: 'var(--ink-2)' }}>
                  {CHANNEL_LABELS[comm.channel] ?? comm.channel}
                </span>
                <span style={{ color: 'var(--ink-3)' }}>·</span>
                <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
                  {formatDate(comm.sentAt)}
                </span>
              </div>
              {comm.sentBy && (
                <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-3)' }}>
                  Sent by: {comm.sentBy}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded p-3"
          style={{ border: '1px solid var(--a30-border)' }}
        >
          <h4 className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
            Record communication
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="comm-kind">Kind</Label>
              <select
                id="comm-kind"
                className="block w-full rounded px-2 py-1 text-sm"
                style={{ border: '1px solid var(--a30-border)' }}
                value={kind}
                onChange={e => setKind(e.target.value as RequesterCommunicationKind)}
                required
              >
                {(Object.keys(KIND_LABELS) as RequesterCommunicationKind[]).map(k => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="comm-channel">Channel</Label>
              <select
                id="comm-channel"
                className="block w-full rounded px-2 py-1 text-sm"
                style={{ border: '1px solid var(--a30-border)' }}
                value={channel}
                onChange={e => setChannel(e.target.value as RequesterCommunicationChannel)}
                required
              >
                {(Object.keys(CHANNEL_LABELS) as RequesterCommunicationChannel[]).map(k => (
                  <option key={k} value={k}>
                    {CHANNEL_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="comm-sent-at">Sent at</Label>
            <input
              id="comm-sent-at"
              type="datetime-local"
              className="block w-full rounded px-2 py-1 text-sm"
              style={{ border: '1px solid var(--a30-border)' }}
              value={sentAt}
              onChange={e => setSentAt(e.target.value)}
              required
            />
          </div>
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Recording…' : 'Record'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
