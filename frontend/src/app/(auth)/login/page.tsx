'use client';

import { useCallback, useState, type SyntheticEvent } from 'react';

import Link from 'next/link';
import { useI18n } from '@/i18n/context';
import { login } from '@/lib/auth';
import { useServerConfig } from '@/lib/config/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AuthCardHeader } from '@/components/auth/auth-card-header';

export default function LoginPage() {
  const { t } = useI18n();
  const { smtpEnabled, bootstrapAvailable } = useServerConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      await login(email, password);
      globalThis.location.href = '/';
    } catch {
      setError(t('auth.error.invalid'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="a30-card">
        <AuthCardHeader subtitleKey="auth.login" />
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <CardContent className="flex flex-col gap-4">
            {error && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2">
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                required
                autoComplete="current-password"
              />
            </div>
            {smtpEnabled && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  {t('auth.login.forgotLink')}
                </Link>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-fg)' }}
              disabled={loading}
            >
              {t('auth.loginButton')}
            </Button>
            {bootstrapAvailable && (
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                {t('auth.noAccount')}{' '}
                <Link
                  href="/signup"
                  className="hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  {t('auth.signup')}
                </Link>
              </p>
            )}
          </CardFooter>
        </form>
      </Card>

      <Card className="a30-card">
        <CardHeader>
          <CardTitle>{t('auth.dsr.title')}</CardTitle>
          <CardDescription>{t('auth.dsr.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dsr/submit"
            className="inline-flex w-full items-center justify-center rounded-md px-3.5 py-2 text-[13px] font-medium"
            style={{
              background: 'var(--surface)',
              color: 'var(--ink)',
              border: '1px solid var(--a30-border)',
            }}
          >
            {t('auth.dsr.cta')}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
