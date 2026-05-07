'use client';

import { useCallback, useState, type SyntheticEvent, type ReactNode } from 'react';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DsrType } from '@article30/shared';
import type { DataSubjectRequestDto } from '@article30/shared';

const FIELD_WRAPPER_CLASS = 'flex flex-col gap-2';

export default function DsrSubmitPage() {
  const { t } = useI18n();

  const [type, setType] = useState<DsrType>(DsrType.ACCESS);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as DsrType),
    [],
  );
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    [],
  );
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
    [],
  );
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value),
    [],
  );

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<DataSubjectRequestDto>('/dsr/submit', {
        requesterName: name,
        requesterEmail: email,
        type,
        description,
      });
      setConfirmation(t('dsr.submit.confirmation').replace('{{id}}', res.id));
    } catch (err) {
      let message: string;
      if (err instanceof Error) {
        message = err.message;
      } else {
        message = t('auth.error.generic');
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  let submitLabel: string;
  if (loading) {
    submitLabel = t('common.loading');
  } else {
    submitLabel = t('common.create');
  }

  let body: ReactNode;
  if (confirmation) {
    body = (
      <div
        className="rounded-md p-4 text-sm"
        style={{ backgroundColor: 'var(--surface-2)', color: 'var(--primary)' }}
      >
        {confirmation}
      </div>
    );
  } else {
    body = (
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm" style={{ color: 'var(--critical)' }}>
            {error}
          </p>
        )}

        <div className={FIELD_WRAPPER_CLASS}>
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            className="rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={
              {
                border: '1px solid var(--a30-border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--ink)',
                '--tw-ring-color': 'var(--primary)',
              } as React.CSSProperties
            }
            value={type}
            onChange={handleTypeChange}
            required
          >
            {Object.values(DsrType).map(tp => (
              <option key={tp} value={tp}>
                {t(`dsr.type.${tp}`)}
              </option>
            ))}
          </select>
        </div>

        <div className={FIELD_WRAPPER_CLASS}>
          <Label htmlFor="name">{t('dsr.requesterName')}</Label>
          <Input id="name" value={name} onChange={handleNameChange} required autoComplete="name" />
        </div>

        <div className={FIELD_WRAPPER_CLASS}>
          <Label htmlFor="email">{t('dsr.requesterEmail')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            required
            autoComplete="email"
          />
        </div>

        <div className={FIELD_WRAPPER_CLASS}>
          <Label htmlFor="description">{t('dsr.description')}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={handleDescriptionChange}
            rows={4}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-fg)' }}
          disabled={loading}
        >
          {submitLabel}
        </Button>
      </form>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t('dsr.submit.title')}</CardTitle>
            <CardDescription>{t('app.title')}</CardDescription>
          </CardHeader>
          <CardContent>{body}</CardContent>
        </Card>
      </div>
    </div>
  );
}
