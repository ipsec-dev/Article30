'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { TreatmentWizard } from '@/components/domain/treatment-wizard';
import type { TreatmentWizardFormData } from '@/components/domain/treatment-wizard';
import type { TreatmentDto } from '@article30/shared';

function baseWizardData(treatment: TreatmentDto): Partial<TreatmentWizardFormData> {
  return {
    name: treatment.name,
    purpose: treatment.purpose ?? '',
    subPurposes: treatment.subPurposes ?? [],
    legalBasis: treatment.legalBasis ?? '',
    retentionPeriod: treatment.retentionPeriod ?? '',
    securityMeasures: treatment.securityMeasuresDetailed ?? [],
  };
}

function dataWizardData(treatment: TreatmentDto): Partial<TreatmentWizardFormData> {
  return {
    personCategories: treatment.personCategories ?? [],
    dataCategories: treatment.dataCategories ?? [],
    hasSensitiveData: treatment.hasSensitiveData ?? false,
    sensitiveCategories: treatment.sensitiveCategories ?? [],
    recipients: treatment.recipients ?? [],
    transfers: treatment.transfers ?? [],
  };
}

function riskFlagsWizardData(treatment: TreatmentDto): Partial<TreatmentWizardFormData> {
  return {
    hasEvaluationScoring: treatment.hasEvaluationScoring ?? false,
    hasAutomatedDecisions: treatment.hasAutomatedDecisions ?? false,
    hasSystematicMonitoring: treatment.hasSystematicMonitoring ?? false,
    isLargeScale: treatment.isLargeScale ?? false,
    hasCrossDatasetLinking: treatment.hasCrossDatasetLinking ?? false,
    involvesVulnerablePersons: treatment.involvesVulnerablePersons ?? false,
    usesInnovativeTech: treatment.usesInnovativeTech ?? false,
    canExcludeFromRights: treatment.canExcludeFromRights ?? false,
  };
}

function treatmentToWizardData(treatment: TreatmentDto): Partial<TreatmentWizardFormData> {
  return {
    ...baseWizardData(treatment),
    ...dataWizardData(treatment),
    ...riskFlagsWizardData(treatment),
  };
}

export default function EditTreatmentPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [treatment, setTreatment] = useState<TreatmentDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTreatment() {
      try {
        const res = await api.get<TreatmentDto>(`/treatments/${id}`);
        setTreatment(res);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchTreatment();
  }, [id]);

  const handleSuccess = useCallback(
    (updatedTreatment: TreatmentDto) => {
      router.push(`/register/${updatedTreatment.id}`);
    },
    [router],
  );

  const handleCancel = useCallback(() => {
    router.push(`/register/${id}`);
  }, [router, id]);

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

  if (!treatment) {
    return (
      <p className="mt-8 text-center text-sm" style={{ color: 'var(--ink-2)' }}>
        {t('common.noResults')}
      </p>
    );
  }

  const initialData = treatmentToWizardData(treatment);

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
        <TreatmentWizard
          initialData={initialData}
          treatmentId={id}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </>
  );
}
