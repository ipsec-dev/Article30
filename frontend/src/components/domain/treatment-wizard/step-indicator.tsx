'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface StepIndicatorButtonProps {
  index: number;
  label: string;
  currentStep: number;
  totalSteps: number;
  onGoToStep: (step: number) => void;
}

export function StepIndicatorButton({
  index,
  label,
  currentStep,
  totalSteps,
  onGoToStep,
}: Readonly<StepIndicatorButtonProps>) {
  const handleClick = useCallback(() => onGoToStep(index), [index, onGoToStep]);

  let circleClass: string;
  if (index < currentStep) {
    circleClass = 'bg-green-500 text-white';
  } else if (index === currentStep) {
    circleClass = 'bg-[var(--primary)] text-white';
  } else {
    circleClass = 'bg-[var(--surface-2)] text-[var(--ink-3)]';
  }

  let circleContent: React.ReactNode;
  if (index < currentStep) {
    circleContent = (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  } else {
    circleContent = index + 1;
  }

  let cursorClass: string;
  if (index <= currentStep) {
    cursorClass = 'cursor-pointer';
  } else {
    cursorClass = 'cursor-not-allowed';
  }

  let labelColorClass: string;
  if (index === currentStep) {
    labelColorClass = 'text-[var(--primary)]';
  } else {
    labelColorClass = 'text-[var(--ink-3)]';
  }

  let progressLineClass: string;
  if (index < currentStep) {
    progressLineClass = 'bg-green-500';
  } else {
    progressLineClass = 'bg-[var(--surface-2)]';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn('flex flex-col items-center gap-2 group flex-1', cursorClass)}
      disabled={index > currentStep + 1}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
          circleClass,
        )}
      >
        {circleContent}
      </div>
      <span className={cn('text-xs font-medium text-center hidden sm:block', labelColorClass)}>
        {label}
      </span>
      {index < totalSteps - 1 && (
        <div
          className={cn('absolute top-5 left-1/2 w-full h-0.5 -z-10', progressLineClass)}
          style={{ display: 'none' }}
        />
      )}
    </button>
  );
}
