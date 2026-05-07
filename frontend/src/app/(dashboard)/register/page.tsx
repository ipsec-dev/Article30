'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download, Plus } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { getMe } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { TreatmentTable } from '@/components/treatment/treatment-table';
import { TreatmentImportDialog } from '@/components/treatment/treatment-import-dialog';
import { PdfPreviewDialog } from '@/components/domain/pdf-preview-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DELETE_ROLES, EXPORT_ROLES, Role, WRITE_ROLES } from '@article30/shared';
import type { PaginatedResponse, TreatmentDto, UserDto } from '@article30/shared';

const PAGE_SIZE = 10;
const DEFAULT_API_URL = 'http://localhost:3001';
const EXPORT_FAILED_MESSAGE = 'Export failed';

function downloadBlob(blob: Blob, filename: string) {
  const url = globalThis.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  globalThis.URL.revokeObjectURL(url);
}

export default function RegisterPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(null);
  const [treatments, setTreatments] = useState<TreatmentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: '',
    title: '',
  });

  const canWrite = Boolean(user && (WRITE_ROLES as readonly Role[]).includes(user.role));
  const canExport = Boolean(user && (EXPORT_ROLES as readonly Role[]).includes(user.role));
  const canReview = Boolean(user && (user.role === Role.ADMIN || user.role === Role.DPO));
  const canDelete = Boolean(user && (DELETE_ROLES as readonly Role[]).includes(user.role));

  const fetchTreatments = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<TreatmentDto>>(
        `/treatments?page=${p}&limit=${PAGE_SIZE}`,
      );
      setTreatments(res.data);
      setTotal(res.total);
    } catch {
      // intentional — errors surface as empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getMe().then(u => setUser(u));
  }, []);

  useEffect(() => {
    fetchTreatments(page);
  }, [page, fetchTreatments]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExportCsv = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
      const res = await fetch(`${apiUrl}/api/treatments/export`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(EXPORT_FAILED_MESSAGE);
      }
      const blob = await res.blob();
      downloadBlob(blob, 'treatments.csv');
    } catch {
      // intentional — no toast yet
    }
  }, []);

  const handleRowClick = useCallback(
    (tt: TreatmentDto) => {
      router.push(`/register/${tt.id}`);
    },
    [router],
  );

  const handleEdit = useCallback(
    (tt: TreatmentDto) => {
      router.push(`/register/${tt.id}/edit`);
    },
    [router],
  );

  const handleExportPdf = useCallback(
    (tt: TreatmentDto) => {
      setPdfPreview({
        open: true,
        url: `/api/treatments/${tt.id}/export-pdf?locale=${locale}`,
        title: tt.name,
      });
    },
    [locale],
  );

  const [pendingAction, setPendingAction] = useState<{
    type: 'review' | 'delete';
    treatment: TreatmentDto;
  } | null>(null);

  const handleMarkReviewed = useCallback((tt: TreatmentDto) => {
    setPendingAction({ type: 'review', treatment: tt });
  }, []);

  const handleDelete = useCallback((tt: TreatmentDto) => {
    setPendingAction({ type: 'delete', treatment: tt });
  }, []);

  const handlePendingActionConfirm = useCallback(async () => {
    if (!pendingAction) return;
    const { type, treatment } = pendingAction;
    try {
      if (type === 'review') {
        await api.patch(`/treatments/${treatment.id}/mark-reviewed`, {});
      } else {
        await api.delete(`/treatments/${treatment.id}`);
      }
      void fetchTreatments(page);
    } catch {
      // intentional — no toast yet
    }
  }, [pendingAction, fetchTreatments, page]);

  const handlePendingActionOpenChange = useCallback((open: boolean) => {
    if (!open) setPendingAction(null);
  }, []);

  const handlePrev = useCallback(() => setPage(p => p - 1), []);
  const handleNext = useCallback(() => setPage(p => p + 1), []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div
          className="size-8 animate-spin rounded-full border-4"
          style={{
            borderColor: 'var(--border-2)',
            borderTopColor: 'var(--primary)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canExport && (
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download aria-hidden="true" className="mr-1.5 size-3.5" />
            {t('common.exportCsv')}
          </Button>
        )}
        {canWrite && (
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            aria-label={t('register.import.button')}
          >
            {t('register.import.button')}
          </Button>
        )}
        {canWrite && (
          <Link href="/register/new">
            <Button size="sm">
              <Plus aria-hidden="true" className="mr-1.5 size-3.5" />
              {t('common.create')}
            </Button>
          </Link>
        )}
      </div>

      {/* Treatment list */}
      <TreatmentTable
        treatments={treatments}
        onRowClick={handleRowClick}
        actions={{
          onEdit: canWrite ? handleEdit : undefined,
          onExportPdf: canExport ? handleExportPdf : undefined,
          onMarkReviewed: canReview ? handleMarkReviewed : undefined,
          onDelete: canDelete ? handleDelete : undefined,
        }}
      />

      {/* Pagination — only shown when there are multiple pages */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
            {t('common.page')} {page} {t('common.of')} {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={handlePrev}>
              {t('common.previous')}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={handleNext}>
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}

      <TreatmentImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onComplete={() => {
          setImportOpen(false);
          void fetchTreatments(page);
        }}
      />

      <PdfPreviewDialog
        open={pdfPreview.open}
        onOpenChange={open => setPdfPreview(prev => ({ ...prev, open }))}
        url={pdfPreview.url}
        title={pdfPreview.title}
        downloadName={`${pdfPreview.title}.pdf`}
      />

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={handlePendingActionOpenChange}
        onConfirm={handlePendingActionConfirm}
        title={t(
          pendingAction?.type === 'delete'
            ? 'register.delete.title'
            : 'register.markAsReviewed.title',
        )}
        description={t(
          pendingAction?.type === 'delete'
            ? 'register.delete.description'
            : 'register.markAsReviewed.description',
        )}
        confirmLabel={t(
          pendingAction?.type === 'delete' ? 'common.delete' : 'register.markAsReviewed',
        )}
        variant={pendingAction?.type === 'delete' ? 'destructive' : 'default'}
      />
    </div>
  );
}
