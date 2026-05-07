'use client';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type UserDto } from '@article30/shared';
import { UserRow } from './user-row';

interface UsersTableProps {
  users: UserDto[];
  loading: boolean;
  currentUserId: string | undefined;
  actionLoading: string | null;
  onApprove: (id: string) => void;
  onRoleChange: (id: string, role: string) => void;
  onDeactivate: (id: string) => void;
  onResetPassword: (user: UserDto) => void;
  onShowPermissions: () => void;
  t: (key: string) => string;
}

export function UsersTable({
  users,
  loading,
  currentUserId,
  actionLoading,
  onApprove,
  onRoleChange,
  onDeactivate,
  onResetPassword,
  onShowPermissions,
  t,
}: Readonly<UsersTableProps>) {
  if (loading) {
    return (
      <div className="mt-8 flex justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-[var(--surface-2)] border-t-[var(--primary)]" />
      </div>
    );
  }
  if (users.length === 0) {
    return <p className="mt-8 text-center text-sm text-[var(--ink-2)]">{t('users.noUsers')}</p>;
  }
  return (
    <div className="mt-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('users.name')}</TableHead>
            <TableHead>{t('users.email')}</TableHead>
            <TableHead>{t('users.role')}</TableHead>
            <TableHead>{t('users.status')}</TableHead>
            <TableHead>{t('users.createdAt')}</TableHead>
            <TableHead>{t('users.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <UserRow
              key={user.id}
              user={user}
              isSelf={currentUserId === user.id}
              actionLoading={actionLoading}
              onApprove={onApprove}
              onRoleChange={onRoleChange}
              onDeactivate={onDeactivate}
              onResetPassword={onResetPassword}
              onShowPermissions={onShowPermissions}
              t={t}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
