'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/dates';
import { getMe } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Role, WRITE_ROLES } from '@article30/shared';
import type { DocumentDto, UserDto } from '@article30/shared';

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const FILE_SIZE_DECIMALS = 1;
const DEFAULT_API_URL = 'http://localhost:3001';

function formatFileSize(bytes: number): string {
  if (bytes < BYTES_PER_KB) {
    return `${bytes} B`;
  }
  if (bytes < BYTES_PER_MB) {
    return `${(bytes / BYTES_PER_KB).toFixed(FILE_SIZE_DECIMALS)} KB`;
  }
  return `${(bytes / BYTES_PER_MB).toFixed(FILE_SIZE_DECIMALS)} MB`;
}

type DocumentListProps = Readonly<{
  linkedEntity: string;
  linkedEntityId: string;
}>;

interface DocumentRowProps {
  doc: DocumentDto;
  t: (key: string) => string;
  canWrite: boolean;
  onDownload: (docId: string, filename: string) => void;
  onDelete: (docId: string) => void;
}

function DocumentRow({ doc, t, canWrite, onDownload, onDelete }: Readonly<DocumentRowProps>) {
  const handleDownloadClick = useCallback(
    () => onDownload(doc.id, doc.filename),
    [doc.id, doc.filename, onDownload],
  );
  const handleDeleteClick = useCallback(() => onDelete(doc.id), [doc.id, onDelete]);

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {doc.filename}
        </p>
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          {formatFileSize(doc.sizeBytes)}
          {' \u00B7 '}
          {formatDate(doc.uploadedAt)}
          {doc.uploader && ` \u00B7 ${doc.uploader.firstName} ${doc.uploader.lastName}`}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="xs" onClick={handleDownloadClick}>
          {t('documents.download')}
        </Button>
        {canWrite && (
          <Button
            variant="ghost"
            size="xs"
            className="text-red-600 hover:text-red-700"
            onClick={handleDeleteClick}
          >
            {t('documents.delete')}
          </Button>
        )}
      </div>
    </li>
  );
}

export function DocumentList({ linkedEntity, linkedEntityId }: DocumentListProps) {
  const { t } = useI18n();
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<UserDto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canWrite = user && (WRITE_ROLES as readonly Role[]).includes(user.role);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get<DocumentDto[]>(
        `/documents?entity=${linkedEntity}&entityId=${linkedEntityId}`,
      );
      setDocuments(res);
    } catch {
      // error handled by api client
    } finally {
      setLoading(false);
    }
  }, [linkedEntity, linkedEntityId]);

  useEffect(() => {
    getMe().then(u => setUser(u));
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('linkedEntity', linkedEntity);
      formData.append('linkedEntityId', linkedEntityId);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

      const CSRF_COOKIE_RE = /(?:^|;\s*)XSRF-TOKEN=([^;]*)/;
      const csrfMatch = CSRF_COOKIE_RE.exec(document.cookie);
      let csrfToken: string | null;
      if (csrfMatch) {
        csrfToken = decodeURIComponent(csrfMatch[1]);
      } else {
        csrfToken = null;
      }

      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
      }

      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
        headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || res.statusText);
      }

      toast.success(t('documents.uploadSuccess'));
      await fetchDocuments();
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  const handleDownload = useCallback((docId: string, filename: string) => {
    // The backend serves files with Content-Disposition: inline so they preview
    // when navigated to directly (e.g. <img src>). The Download button should
    // actually download, so we use the HTML `download` attribute - browsers
    // honour it for same-origin URLs and override the inline disposition.
    const a = document.createElement('a');
    a.href = `/api/documents/${docId}/download`;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const handleDelete = useCallback(
    async (docId: string) => {
      if (!globalThis.confirm(t('documents.confirmDelete'))) {
        return;
      }
      try {
        await api.delete(`/documents/${docId}`);
        toast.success(t('documents.deleteSuccess'));
        setDocuments(prev => prev.filter(d => d.id !== docId));
      } catch {
        // error handled by api client
      }
    },
    [t],
  );

  const handleFileButtonClick = useCallback(() => fileInputRef.current?.click(), []);

  let uploadButtonLabel: string;
  if (uploading) {
    uploadButtonLabel = t('common.loading');
  } else {
    uploadButtonLabel = t('documents.upload');
  }

  let listContent: React.ReactNode;
  if (loading) {
    listContent = (
      <div className="flex justify-center py-4">
        <div
          className="size-6 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--a30-border)', borderTopColor: 'var(--primary)' }}
        />
      </div>
    );
  } else if (documents.length === 0) {
    listContent = (
      <p className="py-4 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
        {t('documents.noDocuments')}
      </p>
    );
  } else {
    listContent = (
      <ul className="divide-y" style={{ borderColor: 'var(--a30-border)' }}>
        {documents.map(doc => (
          <DocumentRow
            key={doc.id}
            doc={doc}
            t={t}
            canWrite={!!canWrite}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        ))}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('documents.title')}</CardTitle>
          {canWrite && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={handleFileButtonClick}
              >
                {uploadButtonLabel}
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          {t('documents.maxSize')}
        </p>
      </CardHeader>
      <CardContent>{listContent}</CardContent>
    </Card>
  );
}
