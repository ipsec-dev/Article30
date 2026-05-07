'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/context';
import { api, ApiError } from '@/lib/api/client';
import type { TreatmentDto } from '@article30/shared';

import { TreatmentWizardFormData, WIZARD_STEPS, DEFAULT_FORM_DATA } from './types';
import { transformFormToApi } from './transform-form-to-api';

const STEP_DRAFT = 'DRAFT';

const STEP_IDENTIFICATION = 0;
const STEP_DATA = 1;
const STEP_RECIPIENTS = 2;
const STEP_SECURITY = 3;
const STEP_RISK = 4;
const STEP_REVIEW = 5;

interface UseWizardStateArgs {
  initialData?: Partial<TreatmentWizardFormData>;
  treatmentId?: string;
  onSuccess?: (treatment: TreatmentDto) => void;
}

export interface WizardState {
  methods: UseFormReturn<TreatmentWizardFormData>;
  currentStep: number;
  isSubmitting: boolean;
  isSavingDraft: boolean;
  isLastStep: boolean;
  goToStep: (step: number) => Promise<void>;
  handleNext: () => Promise<void>;
  handlePrevious: () => void;
  handleSaveDraft: () => Promise<void>;
  onSubmit: (data: TreatmentWizardFormData) => Promise<void>;
}

export function useWizardState({
  initialData,
  treatmentId,
  onSuccess,
}: UseWizardStateArgs): WizardState {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const methods = useForm<TreatmentWizardFormData>({
    defaultValues: { ...DEFAULT_FORM_DATA, ...initialData },
    mode: 'onChange',
  });

  const { trigger } = methods;

  const validateStep = useCallback(
    async (step: number): Promise<boolean> => {
      switch (step) {
        case STEP_IDENTIFICATION:
          return trigger(['name']);
        case STEP_DATA:
          return trigger(['personCategories', 'dataCategories']);
        case STEP_RECIPIENTS:
          return trigger(['recipients']);
        case STEP_SECURITY:
          return trigger(['retentionPeriod', 'securityMeasures']);
        case STEP_RISK:
          return true;
        case STEP_REVIEW:
          return true;
        default:
          return true;
      }
    },
    [trigger],
  );

  const saveDraft = useCallback(async () => {
    const data = methods.getValues();
    if (!data.name?.trim()) {
      return;
    }

    const payload = transformFormToApi(data);
    setIsSavingDraft(true);
    try {
      if (treatmentId) {
        await api.patch(`/treatments/${treatmentId}`, {
          ...payload,
          status: STEP_DRAFT,
        });
      }
    } catch {
      // Silently fail auto-save
    } finally {
      setIsSavingDraft(false);
    }
  }, [methods, treatmentId]);

  useEffect(() => {
    if (treatmentId && currentStep > 0) {
      saveDraft();
    }
  }, [currentStep, treatmentId, saveDraft]);

  const goToStep = useCallback(
    async (step: number) => {
      if (step < currentStep) {
        setCurrentStep(step);
        return;
      }

      const isValid = await validateStep(currentStep);
      if (isValid) {
        setCurrentStep(step);
      }
    },
    [currentStep, validateStep],
  );

  const handleNext = useCallback(async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSaveDraft = useCallback(async () => {
    const data = methods.getValues();
    const payload = transformFormToApi(data);
    setIsSavingDraft(true);
    try {
      let result: TreatmentDto;
      if (treatmentId) {
        result = await api.patch<TreatmentDto>(`/treatments/${treatmentId}`, {
          ...payload,
          status: STEP_DRAFT,
        });
      } else {
        result = await api.post<TreatmentDto>('/treatments', {
          ...payload,
          status: STEP_DRAFT,
        });
      }
      onSuccess?.(result);
    } catch (err) {
      // ApiError already surfaced a toast via lib/api/client; only toast here for
      // errors that bypassed it (e.g. a network/fetch failure).
      if (!(err instanceof ApiError)) {
        let message: string;
        if (err instanceof Error) {
          message = err.message;
        } else {
          message = t('wizard.errors.saveFailed');
        }
        toast.error(message);
      }
    } finally {
      setIsSavingDraft(false);
    }
  }, [methods, treatmentId, onSuccess, t]);

  const onSubmit = useCallback(
    async (data: TreatmentWizardFormData) => {
      const payload = transformFormToApi(data);
      setIsSubmitting(true);
      try {
        let result: TreatmentDto;
        if (treatmentId) {
          result = await api.patch<TreatmentDto>(`/treatments/${treatmentId}`, {
            ...payload,
            status: STEP_DRAFT,
          });
        } else {
          result = await api.post<TreatmentDto>('/treatments', {
            ...payload,
            status: STEP_DRAFT,
          });
        }
        onSuccess?.(result);
      } catch (err) {
        if (!(err instanceof ApiError)) {
          let message: string;
          if (err instanceof Error) {
            message = err.message;
          } else {
            message = t('wizard.errors.submitFailed');
          }
          toast.error(message);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [treatmentId, onSuccess, t],
  );

  const isLastStep = currentStep >= WIZARD_STEPS.length - 1;

  return {
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
  };
}
