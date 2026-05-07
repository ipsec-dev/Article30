'use client';

import { useEffect, useState } from 'react';
import { useTreatmentProcessing } from '@/lib/dsr/use-treatment-processing';
import type {
  DsrTreatmentProcessing,
  TreatmentProcessingActionTaken,
  VendorPropagationStatus,
} from '@/lib/dsr/types';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n/context';
import type { PaginatedResponse, TreatmentDto } from '@article30/shared';

interface TreatmentProcessingPanelProps {
  dsrId: string;
}

const ACTION_TAKEN_LABELS: Record<TreatmentProcessingActionTaken, string> = {
  NONE: 'None',
  ACCESS_EXPORT: 'Access / export',
  RECTIFIED: 'Rectified',
  DELETED: 'Deleted',
  RESTRICTED: 'Restricted',
  NOT_APPLICABLE: 'Not applicable',
};

const VENDOR_PROPAGATION_LABELS: Record<VendorPropagationStatus, string> = {
  NOT_REQUIRED: 'Not required',
  PENDING: 'Pending',
  PROPAGATED: 'Propagated',
  REFUSED: 'Refused',
};

function truncate(text: string | null, maxLen = 80): string {
  if (!text) return '—';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

interface EditRowFormProps {
  row: DsrTreatmentProcessing;
  onSave: (
    treatmentId: string,
    payload: {
      actionTaken: TreatmentProcessingActionTaken;
      vendorPropagationStatus: VendorPropagationStatus;
      findingsSummary?: string;
    },
  ) => Promise<void>;
  onCancel: () => void;
}

function EditRowForm({ row, onSave, onCancel }: EditRowFormProps) {
  const [actionTaken, setActionTaken] = useState<TreatmentProcessingActionTaken>(row.actionTaken);
  const [vendorStatus, setVendorStatus] = useState<VendorPropagationStatus>(
    row.vendorPropagationStatus,
  );
  const [findingsSummary, setFindingsSummary] = useState(row.findingsSummary ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSave(row.treatmentId, {
        actionTaken,
        vendorPropagationStatus: vendorStatus,
        findingsSummary: findingsSummary.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded p-3 text-sm"
      style={{ border: '1px solid var(--a30-border)' }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`action-taken-${row.treatmentId}`}>Action taken</Label>
          <select
            id={`action-taken-${row.treatmentId}`}
            className="block w-full rounded px-2 py-1 text-sm"
            style={{ border: '1px solid var(--a30-border)' }}
            value={actionTaken}
            onChange={e => setActionTaken(e.target.value as TreatmentProcessingActionTaken)}
          >
            {(Object.keys(ACTION_TAKEN_LABELS) as TreatmentProcessingActionTaken[]).map(k => (
              <option key={k} value={k}>
                {ACTION_TAKEN_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`vendor-status-${row.treatmentId}`}>Vendor propagation</Label>
          <select
            id={`vendor-status-${row.treatmentId}`}
            className="block w-full rounded px-2 py-1 text-sm"
            style={{ border: '1px solid var(--a30-border)' }}
            value={vendorStatus}
            onChange={e => setVendorStatus(e.target.value as VendorPropagationStatus)}
          >
            {(Object.keys(VENDOR_PROPAGATION_LABELS) as VendorPropagationStatus[]).map(k => (
              <option key={k} value={k}>
                {VENDOR_PROPAGATION_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor={`findings-${row.treatmentId}`}>Findings summary</Label>
        <Textarea
          id={`findings-${row.treatmentId}`}
          value={findingsSummary}
          onChange={e => setFindingsSummary(e.target.value)}
          rows={2}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

interface LinkTreatmentFormProps {
  dsrId: string;
  onLink: (treatmentId: string) => Promise<void>;
}

function LinkTreatmentForm({ onLink }: LinkTreatmentFormProps) {
  const { t } = useI18n();
  const [treatmentId, setTreatmentId] = useState('');
  const [treatments, setTreatments] = useState<TreatmentDto[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PaginatedResponse<TreatmentDto>>('/treatments?limit=200')
      .then(res => setTreatments(res.data))
      .catch(() => setTreatments([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treatmentId) return;
    setSubmitting(true);
    setError(null);
    try {
      await onLink(treatmentId);
      setTreatmentId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = treatments === null;
  const isEmpty = treatments !== null && treatments.length === 0;

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1">
        <Label htmlFor="link-treatment-id">Treatment</Label>
        <select
          id="link-treatment-id"
          className="block w-full rounded px-2 py-1 text-sm"
          style={{ border: '1px solid var(--a30-border)' }}
          value={treatmentId}
          onChange={e => setTreatmentId(e.target.value)}
          disabled={isLoading || isEmpty || submitting}
          required
        >
          <option value="">
            {isLoading
              ? t('dsr.processing.linkLoading')
              : isEmpty
                ? t('dsr.processing.linkEmpty')
                : t('dsr.processing.linkSelectPlaceholder')}
          </option>
          {(treatments ?? []).map(t => (
            <option key={t.id} value={t.id}>
              {`#${t.refNumber ?? '—'} · ${t.name}`}
            </option>
          ))}
        </select>
        {isEmpty && (
          <p className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
            {t('dsr.processing.linkEmpty')}
          </p>
        )}
      </div>
      <Button type="submit" size="sm" disabled={submitting || !treatmentId || isLoading || isEmpty}>
        {submitting ? 'Linking…' : 'Link treatment'}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function TreatmentProcessingPanel({ dsrId }: TreatmentProcessingPanelProps) {
  const { t } = useI18n();
  const { processingLogs, loading, error, upsert, link } = useTreatmentProcessing(dsrId);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleSave = async (
    treatmentId: string,
    payload: {
      actionTaken: TreatmentProcessingActionTaken;
      vendorPropagationStatus: VendorPropagationStatus;
      findingsSummary?: string;
    },
  ) => {
    await upsert(treatmentId, payload);
    setEditingId(null);
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
        Treatment processing
      </h3>

      {processingLogs.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
          No treatments linked yet.
        </p>
      )}

      {processingLogs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr
                className="text-left"
                style={{ borderBottom: '1px solid var(--a30-border)', color: 'var(--ink-3)' }}
              >
                <th className="py-2 pr-3 font-medium">Treatment</th>
                <th className="py-2 pr-3 font-medium">Searched at</th>
                <th className="py-2 pr-3 font-medium">Action taken</th>
                <th className="py-2 pr-3 font-medium">Action at</th>
                <th className="py-2 pr-3 font-medium">Vendor propagation</th>
                <th className="py-2 pr-3 font-medium">Findings</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {processingLogs.map(row => (
                <>
                  <tr key={row.treatmentId} style={{ borderBottom: '1px solid var(--a30-border)' }}>
                    <td className="py-2 pr-3 font-medium" style={{ color: 'var(--ink-2)' }}>
                      {row.treatmentName}
                    </td>
                    <td className="py-2 pr-3" style={{ color: 'var(--ink-3)' }}>
                      {formatDate(row.searchedAt)}
                    </td>
                    <td className="py-2 pr-3" style={{ color: 'var(--ink-2)' }}>
                      {ACTION_TAKEN_LABELS[row.actionTaken] ?? row.actionTaken}
                    </td>
                    <td className="py-2 pr-3" style={{ color: 'var(--ink-3)' }}>
                      {formatDate(row.actionTakenAt)}
                    </td>
                    <td className="py-2 pr-3" style={{ color: 'var(--ink-2)' }}>
                      {VENDOR_PROPAGATION_LABELS[row.vendorPropagationStatus] ??
                        row.vendorPropagationStatus}
                    </td>
                    <td className="py-2 pr-3" style={{ color: 'var(--ink-2)' }}>
                      {truncate(row.findingsSummary)}
                    </td>
                    <td className="py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditingId(editingId === row.treatmentId ? null : row.treatmentId)
                        }
                      >
                        {editingId === row.treatmentId ? 'Close' : 'Edit'}
                      </Button>
                    </td>
                  </tr>
                  {editingId === row.treatmentId && (
                    <tr key={`${row.treatmentId}-edit`}>
                      <td colSpan={7} className="py-2">
                        <EditRowForm
                          row={row}
                          onSave={handleSave}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pt-2">
        <LinkTreatmentForm dsrId={dsrId} onLink={link} />
      </div>
    </section>
  );
}
