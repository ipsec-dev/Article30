'use client';

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
import { type UserDto } from '@article30/shared';

interface ResetPasswordConfirmDialogProps {
  open: boolean;
  target: UserDto | null;
  actionLoading: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  t: (key: string) => string;
}

export function ResetPasswordConfirmDialog({
  open,
  target,
  actionLoading,
  onOpenChange,
  onConfirm,
  t,
}: Readonly<ResetPasswordConfirmDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>{t('users.resetPassword.confirm.title')}</DialogTitle>
              <DialogDescription>
                {t('users.resetPassword.confirm.body').replace('{email}', target.email)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t('users.resetPassword.confirm.cancel')}</Button>
              </DialogClose>
              <Button onClick={onConfirm} disabled={actionLoading !== null}>
                {t('users.resetPassword.confirm.action')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
