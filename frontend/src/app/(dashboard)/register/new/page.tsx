'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { Button } from '@/components/ui/button';
import { TreatmentWizard } from '@/components/domain/treatment-wizard';
import type { TreatmentDto } from '@article30/shared';

export default function NewTreatmentPage() {
  const { t } = useI18n();
  const router = useRouter();

  const handleSuccess = useCallback(
    (treatment: TreatmentDto) => {
      router.push(`/register/${treatment.id}`);
    },
    [router],
  );

  const handleCancel = useCallback(() => {
    router.push('/register');
  }, [router]);

  return (
    <>
      <div
        className="mb-6 flex items-center justify-end py-3"
        style={{ borderBottom: `1px solid var(--ink-3)` }}
      >
        <Button variant="outline" size="sm" onClick={handleCancel}>
          {t('common.back')}
        </Button>
      </div>

      <div className="mt-6">
        <TreatmentWizard onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </>
  );
}
