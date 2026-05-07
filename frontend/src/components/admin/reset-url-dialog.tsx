'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ResetUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  expiresInMinutes: number;
  title: string;
  description: string;
  copyLabel: string;
  closeLabel: string;
  expiresNoteTemplate: string; // e.g. "Expires in {minutes} minutes."
}

export function ResetUrlDialog({
  open,
  onOpenChange,
  url,
  expiresInMinutes,
  title,
  description,
  copyLabel,
  closeLabel,
  expiresNoteTemplate,
}: Readonly<ResetUrlDialogProps>) {
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(url);
  }, [url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div
          className="rounded border p-3 font-mono text-xs break-all"
          style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--a30-border)' }}
        >
          {url}
        </div>
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          {expiresNoteTemplate.replace('{minutes}', String(expiresInMinutes))}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>
            {copyLabel}
          </Button>
          <DialogClose asChild>
            <Button>{closeLabel}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
