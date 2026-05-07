'use client';

import { useCallback, useState, type SyntheticEvent } from 'react';

import Link from 'next/link';
import { PASSWORD_POLICY } from '@article30/shared';
import { useI18n } from '@/i18n/context';
import { useServerConfig } from '@/lib/config/context';
import { signup } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { AuthCardHeader } from '@/components/auth/auth-card-header';

export default function SignupPage() {
  const { t } = useI18n();
  const { bootstrapAvailable } = useServerConfig();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFirstNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value),
    [],
  );
  const handleLastNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value),
    [],
  );
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
    [],
  );
  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
    [],
  );

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signup(firstName, lastName, email, password);
      if (user.approved) {
        globalThis.location.href = '/';
      } else {
        globalThis.location.href = '/pending';
      }
    } catch {
      setError(t('auth.error.generic'));
    } finally {
      setLoading(false);
    }
  }

  if (!bootstrapAvailable) {
    return (
      <Card className="w-full max-w-md">
        <AuthCardHeader subtitleKey="auth.signup.closed.title" />
        <CardContent>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            {t('auth.signup.closed.body')}
          </p>
          <div className="mt-4">
            <Link
              href="/login"
              className="text-sm hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              {t('auth.signup.closed.backToLogin')}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const flexColGap2 = 'flex flex-col gap-2';

  return (
    <Card>
      <AuthCardHeader subtitleKey="auth.signup" />
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <p className="text-sm" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <div className={`${flexColGap2} flex-1`}>
              <Label htmlFor="firstName">{t('auth.firstName')}</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={handleFirstNameChange}
                required
                autoComplete="given-name"
              />
            </div>
            <div className={`${flexColGap2} flex-1`}>
              <Label htmlFor="lastName">{t('auth.lastName')}</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={handleLastNameChange}
                required
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className={flexColGap2}>
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              required
              autoComplete="email"
            />
          </div>
          <div className={flexColGap2}>
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              required
              minLength={PASSWORD_POLICY.minLength}
              autoComplete="new-password"
            />
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              {t('auth.password.hint').replace('{{min}}', String(PASSWORD_POLICY.minLength))}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-fg)' }}
            disabled={loading}
          >
            {t('auth.signupButton')}
          </Button>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
            {t('auth.hasAccount')}{' '}
            <Link href="/login" className="hover:underline" style={{ color: 'var(--primary)' }}>
              {t('auth.login')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
