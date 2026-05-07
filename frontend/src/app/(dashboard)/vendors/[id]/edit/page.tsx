'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { VendorDto } from '@article30/shared';
import { BasicInfoFields } from './_components/basic-info-fields';
import { ContactFields } from './_components/contact-fields';
import { DpaFields } from './_components/dpa-fields';
import { SubProcessorFields } from './_components/sub-processor-fields';
import { TreatmentChecklist } from './_components/treatment-checklist';
import { useVendorForm } from './_components/use-vendor-form';

export default function EditVendorPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const { fetching, vendors, treatments, values, handlers } = useVendorForm(id);

  const handleBack = useCallback(() => router.push(`/vendors/${id}`), [router, id]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: values.name,
        dpaStatus: values.dpaStatus,
        isSubProcessor: values.isSubProcessor,
        treatmentIds: values.treatmentIds,
        description: values.description || undefined,
        contactName: values.contactName || undefined,
        contactEmail: values.contactEmail || undefined,
        country: values.country || undefined,
        dpaSigned: values.dpaSigned || undefined,
        dpaExpiry: values.dpaExpiry || undefined,
        parentVendorId: values.parentVendorId || undefined,
      };
      await api.patch<VendorDto>(`/vendors/${id}`, body);
      router.push(`/vendors/${id}`);
    } catch {
      // handled by api client
    } finally {
      setIsLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="mt-8 flex justify-center">
        <div
          className="size-8 animate-spin rounded-full border-4"
          style={{
            borderColor: 'var(--surface)',
            borderTopColor: 'currentColor',
          }}
        />
      </div>
    );
  }

  let submitLabel: string;
  if (isLoading) {
    submitLabel = t('common.loading');
  } else {
    submitLabel = t('common.save');
  }

  return (
    <div className="flex flex-col gap-6 p-6" style={{ backgroundColor: 'var(--surface)' }}>
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={handleBack}>
          {t('common.back')}
        </Button>
      </div>

      <Card style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--a30-border)' }}>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <BasicInfoFields
              name={values.name}
              description={values.description}
              onNameChange={handlers.handleNameChange}
              onDescriptionChange={handlers.handleDescriptionChange}
            />
            <ContactFields
              contactName={values.contactName}
              contactEmail={values.contactEmail}
              country={values.country}
              onContactNameChange={handlers.handleContactNameChange}
              onContactEmailChange={handlers.handleContactEmailChange}
              onCountryChange={handlers.handleCountryChange}
            />
            <DpaFields
              dpaStatus={values.dpaStatus}
              dpaSigned={values.dpaSigned}
              dpaExpiry={values.dpaExpiry}
              onDpaStatusChange={handlers.handleDpaStatusChange}
              onDpaSignedChange={handlers.handleDpaSignedChange}
              onDpaExpiryChange={handlers.handleDpaExpiryChange}
            />
            <SubProcessorFields
              isSubProcessor={values.isSubProcessor}
              parentVendorId={values.parentVendorId}
              vendors={vendors}
              onSubProcessorChange={handlers.handleSubProcessorChange}
              onParentVendorChange={handlers.handleParentVendorChange}
            />
            <TreatmentChecklist
              treatments={treatments}
              treatmentIds={values.treatmentIds}
              onToggle={handlers.toggleTreatment}
            />

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
  );
}
