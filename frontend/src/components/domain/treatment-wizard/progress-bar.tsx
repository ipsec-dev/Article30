'use client';

import { StepIndicatorButton } from './step-indicator';

const PERCENT = 100;

interface WizardProgressProps {
  stepLabels: readonly string[];
  currentStep: number;
  totalSteps: number;
  onGoToStep: (step: number) => void;
}

export function WizardProgress({
  stepLabels,
  currentStep,
  totalSteps,
  onGoToStep,
}: Readonly<WizardProgressProps>) {
  const progressWidth = `${((currentStep + 1) / totalSteps) * PERCENT}%`;

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        {stepLabels.map((label, index) => (
          <StepIndicatorButton
            key={label}
            index={index}
            label={label}
            currentStep={currentStep}
            totalSteps={stepLabels.length}
            onGoToStep={onGoToStep}
          />
        ))}
      </div>

      <div className="w-full bg-[var(--surface-2)] rounded-full h-2 mb-6">
        <div
          className="bg-[var(--primary)] h-2 rounded-full transition-all duration-300"
          style={{ width: progressWidth }}
        />
      </div>
    </>
  );
}
