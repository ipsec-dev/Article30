'use client';

import { HelpCircle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_ROLES, Role } from '@article30/shared';

const HELP_ICON_CLASS = 'text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]';
const ROLE_MATRIX_ICON_LABEL_KEY = 'roleMatrix.iconLabel';

interface InviteUserFormDialogProps {
  open: boolean;
  email: string;
  role: Role;
  actionLoading: string | null;
  onOpenChange: (open: boolean) => void;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRoleChange: (v: string) => void;
  onShowPermissions: () => void;
  onSubmit: () => void;
  t: (key: string) => string;
}

export function InviteUserFormDialog({
  open,
  email,
  role,
  actionLoading,
  onOpenChange,
  onEmailChange,
  onRoleChange,
  onShowPermissions,
  onSubmit,
  t,
}: Readonly<InviteUserFormDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users.invite.form.title')}</DialogTitle>
          <DialogDescription>{t('users.invite.form.body')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">{t('users.invite.form.emailLabel')}</Label>
            <Input id="invite-email" type="email" value={email} onChange={onEmailChange} required />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="invite-role">{t('users.invite.form.roleLabel')}</Label>
              <button
                type="button"
                onClick={onShowPermissions}
                aria-label={t(ROLE_MATRIX_ICON_LABEL_KEY)}
                title={t(ROLE_MATRIX_ICON_LABEL_KEY)}
                className={HELP_ICON_CLASS}
              >
                <HelpCircle className="size-4" />
              </button>
            </div>
            <Select value={role} onValueChange={onRoleChange}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map(r => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('users.invite.form.cancel')}</Button>
          </DialogClose>
          <Button onClick={onSubmit} disabled={actionLoading !== null || !email}>
            {t('users.invite.form.action')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
