'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ViolationForm } from '@/components/domain/violation-form';
import type { ViolationFormData } from '@/components/domain/violation-form';
import type { ViolationDto } from '@article30/shared';

const VIOLATIONS_PATH = '/violations';

export default function NewViolationPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (data: ViolationFormData) => {
      setIsLoading(true);
      try {
        await api.post<ViolationDto>(VIOLATIONS_PATH, data);
        router.push(VIOLATIONS_PATH);
      } catch {
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const handleBack = useCallback(() => router.push(VIOLATIONS_PATH), [router]);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--surface)' }}>
      <div className="flex-none p-6 border-b" style={{ borderColor: 'var(--a30-border)' }}>
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={handleBack}>
            {t('common.back')}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <ViolationForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
