'use client';

import { Suspense, useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PASSWORD_POLICY } from '@article30/shared';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AuthCardHeader } from '@/components/auth/auth-card-header';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  // `?invite=1` is set by the user-invite email; forgot-password and
  // admin-issued resets omit it. We only ask for first/last name on the
  // invite path — existing users keep their stored names.
  const isInvite = searchParams.get('invite') === '1';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError(t('auth.resetPassword.missingToken'));
    }
  }, [token, t]);

  const handleFirstNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value),
    [],
  );
  const handleLastNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value),
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

  if (!token) {
    return (
      <Card className="a30-card">
        <AuthCardHeader subtitleKey="auth.resetPassword.title" />
        <CardContent>
          <p className="text-sm mb-4" style={{ color: 'var(--danger)' }}>
            {t('auth.resetPassword.invalidTokenCard')}
          </p>
          <Link
            href="/forgot-password"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            {t('auth.resetPassword.requestNew')}
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t('auth.resetPassword.mismatchError'));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        newPassword,
      });
      toast.success(t('auth.resetPassword.successToast'));
      router.push('/login');
    } catch (err) {
      let message: string;
      if (err instanceof Error) {
        message = err.message;
      } else {
        message = t('auth.resetPassword.genericError');
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="a30-card">
      <AuthCardHeader subtitleKey="auth.resetPassword.title" />
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isInvite && (
            <div className="flex gap-3">
              <div className="flex flex-col gap-2 flex-1">
                <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <Label htmlFor="lastName">{t('auth.lastName')}</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={handleLastNameChange}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">{t('auth.resetPassword.newPasswordLabel')}</Label>
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
            <Label htmlFor="confirm-password">{t('auth.resetPassword.confirmLabel')}</Label>
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
          <Button
            type="submit"
            disabled={submitting}
            className="w-full"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            {t('auth.resetPassword.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
