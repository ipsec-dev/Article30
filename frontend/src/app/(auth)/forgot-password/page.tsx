'use client';

import { useCallback, useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/context';
import { useServerConfig } from '@/lib/config/context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AuthCardHeader } from '@/components/auth/auth-card-header';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const { smtpEnabled } = useServerConfig();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
    [],
  );

  if (!smtpEnabled) {
    return (
      <Card className="a30-card">
        <AuthCardHeader subtitleKey="auth.forgotPassword.disabled.title" />
        <CardContent>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            {t('auth.forgotPassword.disabled.body')}
          </p>
          <div className="mt-4">
            <Link
              href="/login"
              className="text-sm hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="a30-card">
        <AuthCardHeader subtitleKey="auth.forgotPassword.title" />
        <CardContent>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            {t('auth.forgotPassword.successCard')}
          </p>
          <div className="mt-4">
            <Link
              href="/login"
              className="text-sm hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="a30-card">
      <AuthCardHeader subtitleKey="auth.forgotPassword.title" />
      <CardContent>
        <p className="text-sm mb-4" style={{ color: 'var(--ink-2)' }}>
          {t('auth.forgotPassword.body')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t('auth.forgotPassword.emailLabel')}</Label>
            <Input id="email" type="email" value={email} onChange={handleEmailChange} required />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            {t('auth.forgotPassword.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
