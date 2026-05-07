'use client';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/context';

interface WizardNavigationProps {
  currentStep: number;
  isLastStep: boolean;
  isSubmitting: boolean;
  isSavingDraft: boolean;
  onCancel?: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
}

export function WizardNavigation({
  currentStep,
  isLastStep,
  isSubmitting,
  isSavingDraft,
  onCancel,
  onPrevious,
  onNext,
  onSaveDraft,
}: Readonly<WizardNavigationProps>) {
  const { t } = useI18n();

  let submitLabel: string;
  if (isSubmitting) {
    submitLabel = t('common.loading');
  } else {
    submitLabel = t('wizard.navigation.save');
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {isSavingDraft && (
          <span className="text-sm text-[var(--ink-3)] self-center">{t('common.loading')}</span>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
          disabled={isSavingDraft || isSubmitting}
        >
          {t('wizard.navigation.saveAsDraft')}
        </Button>

        {currentStep > 0 && (
          <Button type="button" variant="outline" onClick={onPrevious}>
            {t('wizard.navigation.previous')}
          </Button>
        )}

        {!isLastStep && (
          <Button type="button" onClick={onNext}>
            {t('wizard.navigation.next')}
          </Button>
        )}
        {isLastStep && (
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
