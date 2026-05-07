'use client';

import { useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Mirrors the backend's ImportRowStatus union from
// backend/src/modules/treatments/dto/import-preview.dto.ts. Kept inline here
// rather than imported from shared because the dialog only needs the literals
// for status-key lookup; if we move to a richer error shape, reconsider.
type ImportStatus = 'ok' | 'conflict' | 'invalid';

interface ImportRow {
  rowNumber: number;
  name: string;
  status: ImportStatus;
  errors: string[];
}

interface ImportPreview {
  rows: ImportRow[];
  summary: { ok: number; conflict: number; invalid: number; total: number };
}

interface TreatmentImportDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: (created: number) => void;
}

const STATUS_KEY: Record<ImportStatus, string> = {
  ok: 'register.import.status.ok',
  conflict: 'register.import.status.conflict',
  invalid: 'register.import.status.invalid',
};

// Per-row error codes the backend can emit (must stay in sync with
// backend/src/modules/treatments/treatments-import.service.ts validation pass).
// New codes must add a matching `register.import.error.<code>` key in both en.json and fr.json.
const KNOWN_ROW_ERROR_CODES = new Set<string>([
  'missing_name',
  'invalid_legal_basis',
  'unknown_assignee_email',
  'name_conflict_existing',
  'name_conflict_in_file',
]);

// Structural failures emit `BadRequestException` with these codes (some carry a
// `:detail` suffix the backend computes — strip it for the i18n lookup).
const STRUCTURAL_ERROR_CODES = new Set<string>([
  'file_too_large',
  'xlsx_unreadable',
  'treatments_sheet_missing',
  'missing_columns',
  'too_many_rows',
  'file_required',
]);

export function TreatmentImportDialog({ open, onClose, onComplete }: TreatmentImportDialogProps) {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setSubmitting(false);
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setPreview(null);
  };

  function getCsrfToken(): string | null {
    const match = /(?:^|;\s*)XSRF-TOKEN=([^;]*)/.exec(document.cookie);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function csrfHeaders(): Record<string, string> {
    const token = getCsrfToken();
    return token ? { 'X-XSRF-TOKEN': token } : {};
  }

  const handlePreview = async () => {
    if (!file) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/treatments/import?dryRun=true', {
        method: 'POST',
        body: fd,
        credentials: 'include',
        headers: csrfHeaders(),
      });

      if (res.ok) {
        setPreview((await res.json()) as ImportPreview);
        return;
      }

      // Backend's BadRequestException carries a code in `message`. Extract the
      // base code (before any `:detail` suffix) and look up an i18n key for it.
      let messageCode: string | undefined;
      try {
        const body = (await res.json()) as { message?: string };
        messageCode = typeof body.message === 'string' ? body.message.split(':')[0] : undefined;
      } catch {
        // Body wasn't JSON.
      }
      const i18nKey =
        messageCode && STRUCTURAL_ERROR_CODES.has(messageCode)
          ? `register.import.error.${messageCode}`
          : 'register.import.errorToast';
      toast.error(t(i18nKey));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!file || !preview) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/treatments/import?dryRun=false', {
        method: 'POST',
        body: fd,
        credentials: 'include',
        headers: csrfHeaders(),
      });

      if (res.ok) {
        const body = (await res.json()) as { created: number };
        toast.success(t('register.import.successToast').replace('{{count}}', String(body.created)));
        onComplete(body.created);
        reset();
        onClose();
        return;
      }

      // 409 carries a fresh preview; surface it inline so the user sees the new errors.
      let surfacedFreshPreview = false;
      let messageCode: string | undefined;
      try {
        const body = (await res.json()) as { preview?: ImportPreview; message?: string };
        if (body.preview && Array.isArray(body.preview.rows) && body.preview.summary) {
          setPreview(body.preview);
          surfacedFreshPreview = true;
        }
        if (typeof body.message === 'string') {
          messageCode = body.message.split(':')[0];
        }
      } catch {
        // Body wasn't JSON; fall through to the generic toast.
      }

      const i18nKey =
        messageCode && STRUCTURAL_ERROR_CODES.has(messageCode)
          ? `register.import.error.${messageCode}`
          : 'register.import.errorToast';
      toast.error(t(i18nKey));
      if (surfacedFreshPreview) return;
    } finally {
      setSubmitting(false);
    }
  };

  const blocked = !preview || preview.summary.invalid + preview.summary.conflict > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('register.import.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <a href="/api/treatments/import-template" download className="text-sm underline">
            {t('register.import.downloadTemplate')}
          </a>

          <label className="flex flex-col gap-1 text-sm">
            {t('register.import.fileLabel')}
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFile}
              aria-label={t('register.import.fileLabel')}
            />
          </label>

          {preview && (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                {t('register.import.summary')
                  .replace('{{ok}}', String(preview.summary.ok))
                  .replace('{{conflict}}', String(preview.summary.conflict))
                  .replace('{{invalid}}', String(preview.summary.invalid))}
              </p>
              <ul className="max-h-72 overflow-auto text-sm">
                {preview.rows.map(r => (
                  <li key={r.rowNumber} className="border-b py-1">
                    <strong>
                      {t('register.import.row').replace('{{row}}', String(r.rowNumber))}
                    </strong>{' '}
                    — {r.name || '?'} — {t(STATUS_KEY[r.status])}
                    {r.errors.length > 0 && (
                      <ul className="ml-4 list-disc">
                        {r.errors.map(e => (
                          <li key={e}>
                            {t(
                              KNOWN_ROW_ERROR_CODES.has(e)
                                ? `register.import.error.${e}`
                                : 'register.import.error.unknown',
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            {t('register.import.cancel')}
          </Button>
          <Button onClick={handlePreview} disabled={!file || submitting}>
            {t('register.import.preview')}
          </Button>
          <Button onClick={handleConfirm} disabled={blocked || submitting}>
            {t('register.import.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
