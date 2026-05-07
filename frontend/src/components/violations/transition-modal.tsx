'use client';

import { useState } from 'react';
import { type ViolationStateMachineStatus } from '@article30/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n/context';

interface TransitionModalProps {
  open: boolean;
  onClose: () => void;
  current: ViolationStateMachineStatus;
  target: ViolationStateMachineStatus;
  onSubmit: (
    target: ViolationStateMachineStatus,
    payload: Record<string, unknown>,
  ) => Promise<void>;
}

export function TransitionModal({
  open,
  onClose,
  current,
  target,
  onSubmit,
}: TransitionModalProps) {
  const { t } = useI18n();
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(target, payload);
      setPayload({});
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('violation.transition.modal.title')
              .replace('{{current}}', t(`violation.state.${current}`))
              .replace('{{target}}', t(`violation.state.${target}`))}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {target === 'DISMISSED' && <DismissalFields payload={payload} setPayload={setPayload} />}
          {target === 'NOTIFIED_CNIL' && (
            <CnilFilingFields payload={payload} setPayload={setPayload} />
          )}
          {target === 'PERSONS_NOTIFIED' && (
            <PersonsNotifiedFields payload={payload} setPayload={setPayload} />
          )}
          {target === 'PERSONS_NOTIFICATION_WAIVED' && (
            <WaiverFields payload={payload} setPayload={setPayload} />
          )}
          {target === 'REOPENED' && <ReopenFields payload={payload} setPayload={setPayload} />}
          {target === 'CLOSED' && <ClosedFields payload={payload} setPayload={setPayload} />}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('violation.transition.submitting') : t('common.confirm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface FieldProps {
  payload: Record<string, unknown>;
  setPayload: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}

function DismissalFields({ payload, setPayload }: FieldProps) {
  return (
    <div>
      <Label htmlFor="dismissalReason">Dismissal reason (≥ 10 chars)</Label>
      <Textarea
        id="dismissalReason"
        value={(payload.dismissalReason as string) ?? ''}
        onChange={e => setPayload(p => ({ ...p, dismissalReason: e.target.value }))}
        required
        minLength={10}
      />
    </div>
  );
}

function CnilFilingFields({ payload, setPayload }: FieldProps) {
  return (
    <>
      <div>
        <Label htmlFor="phase">Phase</Label>
        <select
          id="phase"
          className="block w-full rounded px-2 py-1 text-sm"
          style={{ border: '1px solid var(--a30-border)' }}
          value={(payload.phase as string) ?? 'INITIAL'}
          onChange={e => setPayload(p => ({ ...p, phase: e.target.value }))}
        >
          <option value="INITIAL">Initial</option>
          <option value="COMPLEMENTARY">Complementary</option>
        </select>
      </div>
      <div>
        <Label htmlFor="channel">Channel</Label>
        <select
          id="channel"
          className="block w-full rounded px-2 py-1 text-sm"
          style={{ border: '1px solid var(--a30-border)' }}
          value={(payload.channel as string) ?? 'PORTAL'}
          onChange={e => setPayload(p => ({ ...p, channel: e.target.value }))}
        >
          <option value="PORTAL">CNIL portal</option>
          <option value="EMAIL">Email</option>
          <option value="POST">Postal</option>
        </select>
      </div>
      <div>
        <Label htmlFor="referenceNumber">Reference number (optional)</Label>
        <Input
          id="referenceNumber"
          value={(payload.referenceNumber as string) ?? ''}
          onChange={e => setPayload(p => ({ ...p, referenceNumber: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="delayJustification">
          Delay justification (required if &gt; 72h after awareness)
        </Label>
        <Textarea
          id="delayJustification"
          value={(payload.delayJustification as string) ?? ''}
          onChange={e => setPayload(p => ({ ...p, delayJustification: e.target.value }))}
        />
      </div>
    </>
  );
}

function PersonsNotifiedFields({ payload, setPayload }: FieldProps) {
  return (
    <>
      <div>
        <Label htmlFor="method">Method</Label>
        <select
          id="method"
          className="block w-full rounded px-2 py-1 text-sm"
          style={{ border: '1px solid var(--a30-border)' }}
          value={(payload.method as string) ?? 'EMAIL'}
          onChange={e => setPayload(p => ({ ...p, method: e.target.value }))}
        >
          <option value="EMAIL">Email</option>
          <option value="POST">Post</option>
          <option value="PUBLIC_COMMUNICATION">Public communication</option>
          <option value="IN_APP">In-app</option>
        </select>
      </div>
      <div>
        <Label htmlFor="recipientScope">Recipient scope (≥ 5 chars)</Label>
        <Input
          id="recipientScope"
          value={(payload.recipientScope as string) ?? ''}
          onChange={e => setPayload(p => ({ ...p, recipientScope: e.target.value }))}
          required
          minLength={5}
        />
      </div>
    </>
  );
}

function WaiverFields({ payload, setPayload }: FieldProps) {
  return (
    <>
      <div>
        <Label htmlFor="ground">Ground</Label>
        <select
          id="ground"
          className="block w-full rounded px-2 py-1 text-sm"
          style={{ border: '1px solid var(--a30-border)' }}
          value={(payload.ground as string) ?? 'ENCRYPTION'}
          onChange={e => setPayload(p => ({ ...p, ground: e.target.value }))}
        >
          <option value="ENCRYPTION">Encryption (state-of-the-art)</option>
          <option value="RISK_MITIGATED">Risk subsequently mitigated</option>
          <option value="DISPROPORTIONATE_EFFORT_PUBLIC_COMM">
            Disproportionate effort + public communication
          </option>
        </select>
      </div>
      <div>
        <Label htmlFor="justification">Justification (≥ 20 chars)</Label>
        <Textarea
          id="justification"
          value={(payload.justification as string) ?? ''}
          onChange={e => setPayload(p => ({ ...p, justification: e.target.value }))}
          required
          minLength={20}
        />
      </div>
    </>
  );
}

function ReopenFields({ payload, setPayload }: FieldProps) {
  return (
    <div>
      <Label htmlFor="rationale">Reopen rationale (≥ 20 chars)</Label>
      <Textarea
        id="rationale"
        value={(payload.rationale as string) ?? ''}
        onChange={e => setPayload(p => ({ ...p, rationale: e.target.value }))}
        required
        minLength={20}
      />
    </div>
  );
}

function ClosedFields({ payload, setPayload }: FieldProps) {
  return (
    <>
      <div>
        <Label htmlFor="closureReason">Closure reason (optional)</Label>
        <Textarea
          id="closureReason"
          value={(payload.closureReason as string) ?? ''}
          onChange={e => setPayload(p => ({ ...p, closureReason: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="lessonsLearned">Lessons learned (optional)</Label>
        <Textarea
          id="lessonsLearned"
          value={(payload.lessonsLearned as string) ?? ''}
          onChange={e => setPayload(p => ({ ...p, lessonsLearned: e.target.value }))}
        />
      </div>
    </>
  );
}
