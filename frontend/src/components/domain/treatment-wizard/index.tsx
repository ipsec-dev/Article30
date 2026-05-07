'use client';

import { FormProvider } from 'react-hook-form';
import { useI18n } from '@/i18n/context';
import { Card, CardContent } from '@/components/ui/card';
import type { TreatmentDto } from '@article30/shared';

import { Step1Identity } from './step-1-identity';
import { Step2Data } from './step-2-data';
import { Step3Recipients } from './step-3-recipients';
import { Step4Security } from './step-4-security';
import { Step5Risk } from './step-5-risk';
import { Step6Review } from './step-6-review';
import { TreatmentWizardFormData } from './types';
import { WizardProgress } from './progress-bar';
import { WizardNavigation } from './wizard-navigation';
import { useWizardState } from './use-wizard-state';

const STEP_IDENTIFICATION = 0;
const STEP_DATA = 1;
const STEP_RECIPIENTS = 2;
const STEP_SECURITY = 3;
const STEP_RISK = 4;
const STEP_REVIEW = 5;

type TreatmentWizardProps = Readonly<{
  initialData?: Partial<TreatmentWizardFormData>;
  treatmentId?: string;
  onSuccess?: (treatment: TreatmentDto) => void;
  onCancel?: () => void;
}>;

export function TreatmentWizard({
  initialData,
  treatmentId,
  onSuccess,
  onCancel,
}: TreatmentWizardProps) {
  const { t } = useI18n();
  const {
    methods,
    currentStep,
    isSubmitting,
    isSavingDraft,
    isLastStep,
    goToStep,
    handleNext,
    handlePrevious,
    handleSaveDraft,
    onSubmit,
  } = useWizardState({ initialData, treatmentId, onSuccess });

  const stepLabels = [
    t('wizard.step.identification'),
    t('wizard.step.data'),
    t('wizard.step.recipients'),
    t('wizard.step.security'),
    t('wizard.step.riskAssessment'),
    t('wizard.step.summary'),
  ];

  const renderStep = () => {
    switch (currentStep) {
      case STEP_IDENTIFICATION:
        return <Step1Identity />;
      case STEP_DATA:
        return <Step2Data />;
      case STEP_RECIPIENTS:
        return <Step3Recipients />;
      case STEP_SECURITY:
        return <Step4Security />;
      case STEP_RISK:
        return <Step5Risk />;
      case STEP_REVIEW:
        return <Step6Review treatmentId={treatmentId} />;
      default:
        return null;
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
        <WizardProgress
          stepLabels={stepLabels}
          currentStep={currentStep}
          totalSteps={stepLabels.length}
          onGoToStep={goToStep}
        />

        <Card>
          <CardContent className="pt-6">{renderStep()}</CardContent>
        </Card>

        <WizardNavigation
          currentStep={currentStep}
          isLastStep={isLastStep}
          isSubmitting={isSubmitting}
          isSavingDraft={isSavingDraft}
          onCancel={onCancel}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSaveDraft={handleSaveDraft}
        />
      </form>
    </FormProvider>
  );
}

export * from './types';
