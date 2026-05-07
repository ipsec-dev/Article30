'use client';

import { useCallback, useEffect, useState } from 'react';
import { PASSWORD_POLICY } from '@article30/shared';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { getMe } from '@/lib/auth';
import { useTweaks } from '@/lib/tweaks/use-tweaks';
import { TweaksPanel } from '@/components/tweaks/tweaks-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserDto } from '@article30/shared';
import { toast } from 'sonner';

export default function AccountPage() {
  const { t } = useI18n();
  const { tweaks, setTweak } = useTweaks();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe().then(user => {
      if (user) {
        setFirstName(user.firstName ?? '');
        setLastName(user.lastName ?? '');
      }
    });
  }, []);

  const handleFirstNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value),
    [],
  );
  const handleLastNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value),
    [],
  );

  const handleProfileSubmit = useCallback(
    async (event: React.SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      if (!trimmedFirst || !trimmedLast) {
        return;
      }
      setProfileSubmitting(true);
      try {
        const updated = await api.patch<UserDto>('/auth/me', {
          firstName: trimmedFirst,
          lastName: trimmedLast,
        });
        setFirstName(updated.firstName);
        setLastName(updated.lastName);
        toast.success(t('account.profile.successToast'));
      } finally {
        setProfileSubmitting(false);
      }
    },
    [firstName, lastName, t],
  );

  const handleCurrentPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value),
    [],
  );
  const handleNewPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value),
    [],
  );
  const handleConfirmPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value),
    [],
  );

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t('auth.changePassword.mismatchError'));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success(t('auth.changePassword.successToast'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      let message = 'error';
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('account.profile.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm" style={{ color: 'var(--ink-2)' }}>
            {t('account.profile.description')}
          </p>
          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex flex-col gap-2 flex-1">
                <Label htmlFor="profile-firstName">{t('auth.firstName')}</Label>
                <Input
                  id="profile-firstName"
                  type="text"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  required
                  maxLength={120}
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <Label htmlFor="profile-lastName">{t('auth.lastName')}</Label>
                <Input
                  id="profile-lastName"
                  type="text"
                  value={lastName}
                  onChange={handleLastNameChange}
                  required
                  maxLength={120}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={profileSubmitting || !firstName.trim() || !lastName.trim()}
            >
              {t('account.profile.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('auth.changePassword.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="current-password">{t('auth.changePassword.currentLabel')}</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={handleCurrentPasswordChange}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">{t('auth.changePassword.newLabel')}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={handleNewPasswordChange}
                required
                minLength={PASSWORD_POLICY.minLength}
                autoComplete="new-password"
              />
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                {t('auth.password.hint').replace('{{min}}', String(PASSWORD_POLICY.minLength))}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">{t('auth.changePassword.confirmLabel')}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                required
                minLength={PASSWORD_POLICY.minLength}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}
            <Button type="submit" disabled={submitting}>
              {t('auth.changePassword.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Préférences d&apos;affichage</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TweaksPanel tweaks={tweaks} onChange={setTweak} />
        </CardContent>
      </Card>
    </div>
  );
}
