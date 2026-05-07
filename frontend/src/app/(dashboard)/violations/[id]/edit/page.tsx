'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ViolationForm } from '@/components/domain/violation-form';
import type { ViolationFormData } from '@/components/domain/violation-form';
import type { ViolationDto } from '@article30/shared';

export default function EditViolationPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [violation, setViolation] = useState<ViolationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchViolation() {
      try {
        const res = await api.get<ViolationDto>(`/violations/${id}`);
        setViolation(res);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchViolation();
  }, [id]);

  const handleSubmit = useCallback(
    async (data: ViolationFormData) => {
      setIsSubmitting(true);
      try {
        await api.patch<ViolationDto>(`/violations/${id}`, data);
        router.push(`/violations/${id}`);
      } catch {
      } finally {
        setIsSubmitting(false);
      }
    },
    [id, router],
  );

  const handleBack = useCallback(() => router.push(`/violations/${id}`), [id, router]);

  if (loading) {
    return (
      <div className="mt-8 flex justify-center">
        <div
          className="size-8 animate-spin rounded-full border-4"
          style={{
            borderColor: 'var(--ink-2)',
            borderTopColor: 'var(--primary)',
          }}
        />
      </div>
    );
  }

  if (!violation) {
    return (
      <p className="mt-8 text-center text-sm" style={{ color: 'var(--ink-2)' }}>
        {t('common.noResults')}
      </p>
    );
  }

  return (
    <>
      <div
        className="mb-6 flex items-center justify-end py-3"
        style={{ borderBottom: `1px solid var(--ink-3)` }}
      >
        <Button variant="outline" size="sm" onClick={handleBack}>
          {t('common.back')}
        </Button>
      </div>

      <div className="mt-6">
        <ViolationForm
          initialData={{
            title: violation.title,
            description: violation.description ?? '',
            severity: violation.severity,
            // The form's discoveredAt is mapped to awarenessAt server-side;
            // notifiedToCnil/notifiedToPersons are accepted but discarded
            // (after Phase C they live in BreachNotificationFiling /
            // PersonsNotification respectively).
            discoveredAt: violation.awarenessAt,
            notifiedToCnil: false,
            notifiedToPersons: false,
            remediation: violation.remediation ?? '',
          }}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />
      </div>
    </>
  );
}
