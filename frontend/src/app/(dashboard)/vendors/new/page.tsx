'use client';

import { useI18n } from '@/i18n/context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BasicInfoSection } from './_components/basic-info-section';
import { ContactSection } from './_components/contact-section';
import { DpaSection } from './_components/dpa-section';
import { TreatmentsSection } from './_components/treatments-section';
import { useNewVendorForm } from './_components/use-new-vendor-form';

export default function NewVendorPage() {
  const { t } = useI18n();
  const {
    isLoading,
    vendors,
    treatments,
    name,
    description,
    contactName,
    contactEmail,
    country,
    dpaStatus,
    dpaSigned,
    dpaExpiry,
    isSubProcessor,
    parentVendorId,
    treatmentIds,
    toggleTreatment,
    handleBack,
    handleNameChange,
    handleDescriptionChange,
    handleContactNameChange,
    handleContactEmailChange,
    handleCountryChange,
    handleDpaStatusChange,
    handleDpaSignedChange,
    handleDpaExpiryChange,
    handleSubProcessorChange,
    handleParentVendorChange,
    handleSubmit,
  } = useNewVendorForm();

  let submitLabel: string;
  if (isLoading) {
    submitLabel = t('common.loading');
  } else {
    submitLabel = t('common.create');
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={handleBack}>
          {t('common.back')}
        </Button>
      </div>

      <div className="mt-6">
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <BasicInfoSection
                name={name}
                description={description}
                onNameChange={handleNameChange}
                onDescriptionChange={handleDescriptionChange}
              />

              <ContactSection
                contactName={contactName}
                contactEmail={contactEmail}
                country={country}
                onContactNameChange={handleContactNameChange}
                onContactEmailChange={handleContactEmailChange}
                onCountryChange={handleCountryChange}
              />

              <DpaSection
                dpaStatus={dpaStatus}
                dpaSigned={dpaSigned}
                dpaExpiry={dpaExpiry}
                isSubProcessor={isSubProcessor}
                parentVendorId={parentVendorId}
                vendors={vendors}
                onDpaStatusChange={handleDpaStatusChange}
                onDpaSignedChange={handleDpaSignedChange}
                onDpaExpiryChange={handleDpaExpiryChange}
                onSubProcessorChange={handleSubProcessorChange}
                onParentVendorChange={handleParentVendorChange}
              />

              <TreatmentsSection
                treatments={treatments}
                treatmentIds={treatmentIds}
                onToggle={toggleTreatment}
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
    </>
  );
}
