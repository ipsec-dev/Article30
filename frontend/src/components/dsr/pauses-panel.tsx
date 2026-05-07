'use client';

import { useState } from 'react';
import { usePauses } from '@/lib/dsr/use-pauses';
import { useDsrDetail } from '@/lib/dsr/use-dsr-detail';
import type { DsrPauseReason } from '@/lib/dsr/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n/context';

interface PausesPanelProps {
  dsrId: string;
}

const PAUSE_REASONS: DsrPauseReason[] = ['IDENTITY_VERIFICATION', 'SCOPE_CLARIFICATION', 'OTHER'];

const REASON_LABELS: Record<DsrPauseReason, string> = {
  IDENTITY_VERIFICATION: 'Identity verification',
  SCOPE_CLARIFICATION: 'Scope clarification',
  OTHER: 'Other',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function PausesPanel({ dsrId }: PausesPanelProps) {
  const { t } = useI18n();
  const { pauses, loading, error, refresh } = usePauses(dsrId);
  const { dsr, transition } = useDsrDetail(dsrId);

  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState<DsrPauseReason>('IDENTITY_VERIFICATION');
  const [reasonDetails, setReasonDetails] = useState('');
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

  const openPause = pauses.find(p => p.resumedAt === null);
  const canPause = !openPause && dsr?.status === 'IN_PROGRESS';

  const handlePauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await transition('AWAITING_REQUESTER', {
        reason,
        reasonDetails: reasonDetails.trim() || undefined,
      });
      await refresh();
      setShowForm(false);
      setReasonDetails('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
        Pauses
      </h3>

      {pauses.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
          No pauses recorded.
        </p>
      )}

      {pauses.length > 0 && (
        <ul className="space-y-2">
          {pauses.map(pause => (
            <li
              key={pause.id}
              className="rounded px-3 py-2 text-sm"
              style={{ border: '1px solid var(--a30-border)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium" style={{ color: 'var(--ink-2)' }}>
                  {REASON_LABELS[pause.reason] ?? pause.reason}
                </span>
                {pause.resumedAt === null ? (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                    Open
                  </span>
                ) : (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{ background: 'var(--surface-2)', color: 'var(--ink-3)' }}
                  >
                    Closed
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
                <span>Paused: {formatDate(pause.pausedAt)}</span>
                {pause.resumedAt && (
                  <span className="ml-3">Resumed: {formatDate(pause.resumedAt)}</span>
                )}
              </div>
              {pause.reasonDetails && (
                <p className="mt-1 text-xs" style={{ color: 'var(--ink-2)' }}>
                  {pause.reasonDetails}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {openPause && (
        <p className="text-xs text-sky-600">
          An open pause exists. Use the workflow tab to resume (transition to ACKNOWLEDGED).
        </p>
      )}

      {canPause && !showForm && (
        <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)}>
          Pause (awaiting requester)
        </Button>
      )}

      {showForm && (
        <form
          onSubmit={handlePauseSubmit}
          className="space-y-3 rounded p-3"
          style={{ border: '1px solid var(--a30-border)' }}
        >
          <h4 className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
            Pause — awaiting requester
          </h4>
          <div>
            <Label htmlFor="pause-reason">Reason</Label>
            <select
              id="pause-reason"
              className="block w-full rounded px-2 py-1 text-sm"
              style={{ border: '1px solid var(--a30-border)' }}
              value={reason}
              onChange={e => setReason(e.target.value as DsrPauseReason)}
              required
            >
              {PAUSE_REASONS.map(r => (
                <option key={r} value={r}>
                  {REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="pause-reason-details">Reason details (optional)</Label>
            <Textarea
              id="pause-reason-details"
              value={reasonDetails}
              onChange={e => setReasonDetails(e.target.value)}
              rows={2}
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
              {submitting ? 'Submitting…' : 'Pause request'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
