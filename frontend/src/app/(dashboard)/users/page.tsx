'use client';

import { useI18n } from '@/i18n/context';
import { ResetUrlDialog } from '@/components/admin/reset-url-dialog';
import { RolePermissionsDialog } from '@/components/admin/role-permissions-dialog';
import { Button } from '@/components/ui/button';
import { InviteUserFormDialog } from './_components/invite-user-form-dialog';
import { ResetPasswordConfirmDialog } from './_components/reset-password-confirm-dialog';
import { useUsersPageState } from './_components/use-users-page-state';
import { UsersTable } from './_components/users-table';

export default function UsersPage() {
  const { t } = useI18n();
  const {
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
  } = useUsersPageState();

  return (
    <>
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenPermissions}>
            {t('roleMatrix.button')}
          </Button>
          <Button onClick={handleInviteOpen}>{t('users.invite.button')}</Button>
        </div>
      </div>
      <UsersTable
        users={users}
        loading={loading}
        currentUserId={currentUser?.id}
        actionLoading={actionLoading}
        onApprove={handleApprove}
        onRoleChange={handleRoleChange}
        onDeactivate={handleDeactivate}
        onResetPassword={handleResetPasswordOpen}
        onShowPermissions={handleOpenPermissions}
        t={t}
      />
      <ResetPasswordConfirmDialog
        open={resetTarget !== null && resetStep === 'confirm'}
        target={resetTarget}
        actionLoading={actionLoading}
        onOpenChange={handleResetDialogOpenChange}
        onConfirm={handleResetPasswordConfirm}
        t={t}
      />
      <ResetUrlDialog
        open={resetStep === 'url' && resetTarget !== null}
        onOpenChange={handleResetDialogOpenChange}
        url={resetUrl}
        expiresInMinutes={resetExpiresInMinutes}
        title={t('users.resetPassword.success.title')}
        description={t('users.resetPassword.success.body')}
        copyLabel={t('users.resetPassword.success.copy')}
        closeLabel={t('users.resetPassword.success.close')}
        expiresNoteTemplate={t('users.resetPassword.success.expiresNote')}
      />
      <InviteUserFormDialog
        open={inviteOpen && inviteStep === 'form'}
        email={inviteEmail}
        role={inviteRole}
        actionLoading={actionLoading}
        onOpenChange={handleInviteDialogOpenChange}
        onEmailChange={handleInviteEmailChange}
        onRoleChange={handleInviteRoleChange}
        onShowPermissions={handleOpenPermissions}
        onSubmit={handleInviteSubmit}
        t={t}
      />
      <ResetUrlDialog
        open={inviteOpen && inviteStep === 'url'}
        onOpenChange={handleInviteDialogOpenChange}
        url={inviteUrl}
        expiresInMinutes={inviteExpiresInMinutes}
        title={t('users.invite.url.title')}
        description={t('users.invite.url.body')}
        copyLabel={t('users.invite.url.copy')}
        closeLabel={t('users.invite.url.close')}
        expiresNoteTemplate={t('users.invite.url.expiresNote')}
      />
      <RolePermissionsDialog open={permissionsOpen} onOpenChange={setPermissionsOpen} />
    </>
  );
}
