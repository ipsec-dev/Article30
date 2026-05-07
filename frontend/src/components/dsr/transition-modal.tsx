'use client';

import { useState } from 'react';
import { type DsrStateMachineStatus } from '@article30/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n/context';

interface DsrTransitionModalProps {
  open: boolean;
  onClose: () => void;
  current: DsrStateMachineStatus;
  target: DsrStateMachineStatus;
  onSubmit: (target: DsrStateMachineStatus, payload: Record<string, unknown>) => Promise<void>;
}

export function DsrTransitionModal({
  open,
  onClose,
  current,
  target,
  onSubmit,
}: DsrTransitionModalProps) {
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
            {t('dsr.workflow.transitionTitle')
              .replace('{{current}}', t(`dsr.state.${current}`))
              .replace('{{target}}', t(`dsr.state.${target}`))}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {target === 'REJECTED' && <RejectedFields payload={payload} setPayload={setPayload} />}
          {target === 'AWAITING_REQUESTER' && (
            <AwaitingRequesterFields payload={payload} setPayload={setPayload} />
          )}
          {target === 'RESPONDED' && <RespondedFields payload={payload} setPayload={setPayload} />}
          {target === 'PARTIALLY_FULFILLED' && (
            <PartiallyFulfilledFields payload={payload} setPayload={setPayload} />
          )}
          {target === 'WITHDRAWN' && <WithdrawnFields payload={payload} setPayload={setPayload} />}
          {/* Empty-payload targets: ACKNOWLEDGED, IDENTITY_VERIFIED, IN_PROGRESS, CLOSED */}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t('dsr.workflow.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('dsr.workflow.submitting') : t('dsr.workflow.confirm')}
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

function RejectedFields({ payload, setPayload }: FieldProps) {
  return (
    <>
      <div>
        <Label htmlFor="rejectionReason">Rejection reason</Label>
        <select
          id="rejectionReason"
          className="block w-full rounded px-2 py-1 text-sm"
          style={{ border: '1px solid var(--a30-border)' }}
          value={(payload.rejectionReason as string) ?? 'MANIFESTLY_UNFOUNDED'}
          onChange={e => setPayload(p => ({ ...p, rejectionReason: e.target.value }))}
          required
        >
          <option value="MANIFESTLY_UNFOUNDED">Manifestly unfounded</option>
          <option value="EXCESSIVE">Excessive</option>
          <option value="IDENTITY_UNVERIFIABLE">Identity unverifiable</option>
          <option value="REPEAT_NO_NEW_INFO">Repeat request — no new info</option>
          <option value="LEGAL_BASIS_OVERRIDE">Legal basis override</option>
        </select>
      </div>
      <div>
        <Label htmlFor="rejectionDetails">Rejection details (≥ 20 chars)</Label>
        <Textarea
          id="rejectionDetails"
          value={(payload.rejectionDetails as string) ?? ''}
          onChange={e => setPayload(p => ({ ...p, rejectionDetails: e.target.value }))}
          required
          minLength={20}
        />
      </div>
    </>
  );
}

function AwaitingRequesterFields({ payload, setPayload }: FieldProps) {
  return (
    <>
      <div>
        <Label htmlFor="reason">Reason</Label>
        <select
          id="reason"
          className="block w-full rounded px-2 py-1 text-sm"
          style={{ border: '1px solid var(--a30-border)' }}
          value={(payload.reason as string) ?? 'IDENTITY_VERIFICATION'}
          onChange={e => setPayload(p => ({ ...p, reason: e.target.value }))}
          required
        >
          <option value="IDENTITY_VERIFICATION">Identity verification</option>
          <option value="SCOPE_CLARIFICATION">Scope clarification</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div>
        <Label htmlFor="reasonDetails">Reason details (optional)</Label>
        <Textarea
          id="reasonDetails"
          value={(payload.reasonDetails as string) ?? ''}
          onChange={e => setPayload(p => ({ ...p, reasonDetails: e.target.value }))}
        />
      </div>
    </>
  );
}

function RespondedFields({ payload, setPayload }: FieldProps) {
  return (
    <div>
      <Label htmlFor="responseNotes">Response notes (≥ 10 chars)</Label>
      <Textarea
        id="responseNotes"
        value={(payload.responseNotes as string) ?? ''}
        onChange={e => setPayload(p => ({ ...p, responseNotes: e.target.value }))}
        required
        minLength={10}
      />
    </div>
  );
}

function PartiallyFulfilledFields({ payload, setPayload }: FieldProps) {
  return (
    <div>
      <Label htmlFor="partialFulfilmentNotes">Partial fulfilment notes (≥ 10 chars)</Label>
      <Textarea
        id="partialFulfilmentNotes"
        value={(payload.partialFulfilmentNotes as string) ?? ''}
        onChange={e => setPayload(p => ({ ...p, partialFulfilmentNotes: e.target.value }))}
        required
        minLength={10}
      />
    </div>
  );
}

function WithdrawnFields({ payload, setPayload }: FieldProps) {
  return (
    <div>
      <Label htmlFor="withdrawnReason">Withdrawn reason (optional)</Label>
      <Textarea
        id="withdrawnReason"
        value={(payload.withdrawnReason as string) ?? ''}
        onChange={e => setPayload(p => ({ ...p, withdrawnReason: e.target.value }))}
      />
    </div>
  );
}
