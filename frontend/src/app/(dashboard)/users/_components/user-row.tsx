'use client';

import { useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { formatDate } from '@/lib/dates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import { ALL_ROLES, Role, type UserDto } from '@article30/shared';

const BADGE_DEFAULT = 'default' as const;
const BADGE_SECONDARY = 'secondary' as const;
const BADGE_OUTLINE = 'outline' as const;
const BADGE_DESTRUCTIVE = 'destructive' as const;
const HELP_ICON_CLASS = 'text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]';
const ROLE_MATRIX_ICON_LABEL_KEY = 'roleMatrix.iconLabel';

function roleBadgeVariant(role: Role): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case Role.ADMIN:
      return BADGE_DEFAULT;
    case Role.DPO:
      return BADGE_SECONDARY;
    default:
      return BADGE_OUTLINE;
  }
}

interface UserRowProps {
  user: UserDto;
  isSelf: boolean;
  actionLoading: string | null;
  onApprove: (id: string) => void;
  onRoleChange: (id: string, role: string) => void;
  onDeactivate: (id: string) => void;
  onResetPassword: (user: UserDto) => void;
  onShowPermissions: () => void;
  t: (key: string) => string;
}

export function UserRow({
  user,
  isSelf,
  actionLoading,
  onApprove,
  onRoleChange,
  onDeactivate,
  onResetPassword,
  onShowPermissions,
  t,
}: Readonly<UserRowProps>) {
  const isActionDisabled = isSelf || actionLoading === user.id;
  const handleApproveClick = useCallback(() => onApprove(user.id), [onApprove, user.id]);
  const handleDeactivateClick = useCallback(() => onDeactivate(user.id), [onDeactivate, user.id]);
  const handleRoleValueChange = useCallback(
    (v: string) => onRoleChange(user.id, v),
    [onRoleChange, user.id],
  );
  const handleResetPasswordClick = useCallback(
    () => onResetPassword(user),
    [onResetPassword, user],
  );
  let statusVariant: typeof BADGE_DEFAULT | typeof BADGE_DESTRUCTIVE;
  if (user.approved) {
    statusVariant = BADGE_DEFAULT;
  } else {
    statusVariant = BADGE_DESTRUCTIVE;
  }
  let statusLabel: string;
  if (user.approved) {
    statusLabel = t('users.approved');
  } else {
    statusLabel = t('users.pending');
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{`${user.firstName} ${user.lastName}`}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </TableCell>
      <TableCell>{formatDate(user.createdAt)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {!user.approved && (
            <Button size="sm" onClick={handleApproveClick} disabled={isActionDisabled}>
              {t('users.approve')}
            </Button>
          )}
          <div className="flex items-center gap-1">
            <Select
              value={user.role}
              onValueChange={handleRoleValueChange}
              disabled={isActionDisabled}
            >
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map(role => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={onShowPermissions}
              aria-label={t(ROLE_MATRIX_ICON_LABEL_KEY)}
              title={t(ROLE_MATRIX_ICON_LABEL_KEY)}
              className={HELP_ICON_CLASS}
            >
              <HelpCircle className="size-3.5" />
            </button>
          </div>
          {!isSelf && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetPasswordClick}
              disabled={isActionDisabled}
            >
              {t('users.resetPassword.button')}
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDeactivateClick}
            disabled={isActionDisabled}
          >
            {t('users.deactivate')}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
