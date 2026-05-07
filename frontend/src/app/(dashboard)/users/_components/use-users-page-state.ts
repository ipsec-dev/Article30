'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { getMe } from '@/lib/auth';
import { Role, type UserDto } from '@article30/shared';

const USERS_LIMIT = 1000;

export function useUsersPageState() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<UserDto | null>(null);
  const [resetStep, setResetStep] = useState<'confirm' | 'url'>('confirm');
  const [resetUrl, setResetUrl] = useState<string>('');
  const [resetExpiresInMinutes, setResetExpiresInMinutes] = useState<number>(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>(Role.EDITOR);
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [inviteStep, setInviteStep] = useState<'form' | 'url'>('form');
  const [inviteExpiresInMinutes, setInviteExpiresInMinutes] = useState<number>(0);
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [me, usersRes] = await Promise.all([
        getMe(),
        api.get<UserDto[]>(`/users?limit=${USERS_LIMIT}`),
      ]);
      setCurrentUser(me);
      setUsers(usersRes);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = useCallback(
    async (userId: string) => {
      setActionLoading(userId);
      try {
        await api.patch(`/users/${userId}/approve`, {});
        await fetchData();
      } catch {
      } finally {
        setActionLoading(null);
      }
    },
    [fetchData],
  );

  const handleRoleChange = useCallback(
    async (userId: string, role: string) => {
      setActionLoading(userId);
      try {
        await api.patch(`/users/${userId}/role`, { role });
        await fetchData();
      } catch {
      } finally {
        setActionLoading(null);
      }
    },
    [fetchData],
  );

  const handleDeactivate = useCallback(
    async (userId: string) => {
      setActionLoading(userId);
      try {
        await api.patch(`/users/${userId}/deactivate`, {});
        await fetchData();
      } catch {
      } finally {
        setActionLoading(null);
      }
    },
    [fetchData],
  );

  const handleResetPasswordConfirm = useCallback(async () => {
    if (!resetTarget) {
      return;
    }
    setActionLoading(resetTarget.id);
    try {
      const res = await api.patch<{ resetUrl: string; expiresInMinutes: number }>(
        `/users/${resetTarget.id}/admin-reset-password`,
        {},
      );
      setResetUrl(res.resetUrl);
      setResetExpiresInMinutes(res.expiresInMinutes);
      setResetStep('url');
    } catch {
      // api client already toasts the error; close the modal.
      setResetTarget(null);
    } finally {
      setActionLoading(null);
    }
  }, [resetTarget]);

  const handleResetPasswordOpen = useCallback((user: UserDto) => {
    setResetTarget(user);
    setResetStep('confirm');
    setResetUrl('');
  }, []);

  const handleResetDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setResetTarget(null);
      setResetUrl('');
      setResetStep('confirm');
    }
  }, []);

  const handleInviteOpen = useCallback(() => {
    setInviteOpen(true);
    setInviteStep('form');
    setInviteEmail('');
    setInviteRole(Role.EDITOR);
    setInviteUrl('');
  }, []);

  const handleInviteSubmit = useCallback(async () => {
    setActionLoading('invite');
    try {
      const res = await api.post<{
        user: { id: string; email: string; firstName: string; lastName: string; role: Role };
        resetUrl: string;
        expiresInMinutes: number;
      }>('/users', {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteUrl(res.resetUrl);
      setInviteExpiresInMinutes(res.expiresInMinutes);
      setInviteStep('url');
      await fetchData();
    } catch {
      // api client already toasts; keep the form open so the admin can fix.
    } finally {
      setActionLoading(null);
    }
  }, [inviteEmail, inviteRole, fetchData]);

  const handleInviteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setInviteOpen(false);
      setInviteStep('form');
      setInviteUrl('');
    }
  }, []);

  const handleOpenPermissions = useCallback(() => setPermissionsOpen(true), []);

  const handleInviteEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value),
    [],
  );
  const handleInviteRoleChange = useCallback((v: string) => setInviteRole(v as Role), []);

  return {
    users,
    loading,
    currentUser,
    actionLoading,
    resetTarget,
    resetStep,
    resetUrl,
    resetExpiresInMinutes,
    inviteOpen,
    inviteEmail,
    inviteRole,
    inviteUrl,
    inviteStep,
    inviteExpiresInMinutes,
    permissionsOpen,
    setPermissionsOpen,
    handleApprove,
    handleRoleChange,
    handleDeactivate,
    handleResetPasswordConfirm,
    handleResetPasswordOpen,
    handleResetDialogOpenChange,
    handleInviteOpen,
    handleInviteSubmit,
    handleInviteDialogOpenChange,
    handleOpenPermissions,
    handleInviteEmailChange,
    handleInviteRoleChange,
  };
}
