'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { DsrType } from '@article30/shared';
import type { DataSubjectRequestDto, UserDto } from '@article30/shared';

const TEXTAREA_ROWS_SMALL = 2;
const TEXTAREA_ROWS_MEDIUM = 3;
const SELECT_CLASS = 'rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2';

export default function NewDsrPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [users, setUsers] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [type, setType] = useState<DsrType>(DsrType.ACCESS);
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterDetails, setRequesterDetails] = useState('');
  const [description, setDescription] = useState('');
  const [affectedSystems, setAffectedSystems] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  useEffect(() => {
    api
      .get<UserDto[]>('/users')
      .then(u => setUsers(u))
      .catch(() => {});
  }, []);

  const handleBack = useCallback(() => router.push('/dsr'), [router]);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setType(e.target.value as DsrType);
  }, []);
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setRequesterName(e.target.value),
    [],
  );
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setRequesterEmail(e.target.value),
    [],
  );
  const handleDetailsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setRequesterDetails(e.target.value),
    [],
  );
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value),
    [],
  );
  const handleAffectedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setAffectedSystems(e.target.value),
    [],
  );
  const handleAssignedChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => setAssignedTo(e.target.value),
    [],
  );

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const body: Record<string, unknown> = {
        type,
        requesterName,
        requesterEmail,
        requesterDetails: requesterDetails || undefined,
        description: description || undefined,
        affectedSystems: affectedSystems || undefined,
        assignedTo: assignedTo || undefined,
      };
      const res = await api.post<DataSubjectRequestDto>('/dsr', body);
      router.push(`/dsr/${res.id}`);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }

  let submitLabel: string;
  if (isLoading) {
    submitLabel = t('common.loading');
  } else {
    submitLabel = t('common.create');
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginBottom: '1.5rem',
        }}
      >
        <Button variant="outline" size="sm" onClick={handleBack}>
          {t('common.back')}
        </Button>
      </div>

      <div className="mt-6">
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  className={SELECT_CLASS}
                  style={{
                    border: '1px solid var(--a30-border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="requesterName">{t('dsr.requesterName')}</Label>
                  <Input
                    id="requesterName"
                    value={requesterName}
                    onChange={handleNameChange}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="requesterEmail">{t('dsr.requesterEmail')}</Label>
                  <Input
                    id="requesterEmail"
                    type="email"
                    value={requesterEmail}
                    onChange={handleEmailChange}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="requesterDetails">Détails demandeur</Label>
                <Textarea
                  id="requesterDetails"
                  value={requesterDetails}
                  onChange={handleDetailsChange}
                  rows={TEXTAREA_ROWS_SMALL}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="description">{t('dsr.description')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={handleDescriptionChange}
                  rows={TEXTAREA_ROWS_MEDIUM}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="affectedSystems">{t('dsr.affectedSystems')}</Label>
                <Input
                  id="affectedSystems"
                  value={affectedSystems}
                  onChange={handleAffectedChange}
                />
              </div>

              {users.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="assignedTo">{t('dsr.assignedTo')}</Label>
                  <select
                    id="assignedTo"
                    className={SELECT_CLASS}
                    style={{
                      border: '1px solid var(--a30-border)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--ink)',
                    }}
                    value={assignedTo}
                    onChange={handleAssignedChange}
                  >
                    <option value="">—</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {`${u.firstName} ${u.lastName}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleBack}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {submitLabel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
