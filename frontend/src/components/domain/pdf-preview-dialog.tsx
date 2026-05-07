'use client';

import { useCallback } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  downloadName?: string;
}

/**
 * Lightweight in-app PDF viewer. Embeds the PDF via the browser's native
 * viewer in an iframe, with explicit "open in new tab" and "download"
 * shortcuts. The iframe avoids bundling pdf.js.
 */
export function PdfPreviewDialog({
  open,
  onOpenChange,
  url,
  title,
  downloadName,
}: Readonly<PdfPreviewDialogProps>) {
  const { t } = useI18n();

  const handleOpenInTab = useCallback(() => {
    globalThis.open(url, '_blank', 'noopener,noreferrer');
  }, [url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-3 p-4 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <iframe
          // Re-mount when url changes so the cache doesn't show a stale doc.
          key={url}
          src={url}
          title={title}
          className="min-h-0 flex-1 rounded-md border"
          style={{ borderColor: 'var(--a30-border)', backgroundColor: 'var(--surface-2)' }}
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleOpenInTab}>
            <ExternalLink className="size-3.5" />
            {t('pdfPreview.openInTab')}
          </Button>
          <a
            href={url}
            download={downloadName ?? true}
            className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Download className="size-3.5" />
            {t('pdfPreview.download')}
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
