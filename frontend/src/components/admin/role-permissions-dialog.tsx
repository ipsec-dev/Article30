'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { useI18n } from '@/i18n/context';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ROLE_PERMISSION_MATRIX, Role } from '@article30/shared';

const COLUMN_ROLES: readonly Role[] = [
  Role.ADMIN,
  Role.DPO,
  Role.EDITOR,
  Role.PROCESS_OWNER,
  Role.AUDITOR,
];

interface RolePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RolePermissionsDialog({
  open,
  onOpenChange,
}: Readonly<RolePermissionsDialogProps>) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[min(95vw,1200px)]">
        <DialogHeader>
          <DialogTitle>{t('roleMatrix.dialog.title')}</DialogTitle>
          <DialogDescription>{t('roleMatrix.dialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('roleMatrix.dialog.actionColumn')}</TableHead>
                {COLUMN_ROLES.map(role => (
                  <TableHead key={role} className="text-center">
                    {t(`role.${role}`)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLE_PERMISSION_MATRIX.map(cap => (
                <TableRow key={cap.id}>
                  <TableCell className="font-medium">{t(cap.labelKey)}</TableCell>
                  {COLUMN_ROLES.map(role => {
                    const allowed = cap.allowedRoles.includes(role);
                    let indicator: ReactNode;
                    if (allowed) {
                      indicator = <Check className="mx-auto size-4 text-emerald-600" aria-hidden />;
                    } else {
                      indicator = <span aria-hidden>—</span>;
                    }
                    let srLabel: string;
                    if (allowed) {
                      srLabel = t('roleMatrix.dialog.allowed');
                    } else {
                      srLabel = t('roleMatrix.dialog.notAllowed');
                    }
                    return (
                      <TableCell key={role} className="text-center">
                        {indicator}
                        <span className="sr-only">{srLabel}</span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="space-y-1 text-xs" style={{ color: 'var(--ink-3)' }}>
          <p>{t('roleMatrix.footnote.processOwner')}</p>
          <p>{t('roleMatrix.footnote.auditor')}</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>{t('roleMatrix.dialog.close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
