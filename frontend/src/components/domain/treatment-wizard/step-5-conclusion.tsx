'use client';

import { cn } from '@/lib/utils';

interface ConclusionStyles {
  conclusionBoxClass: string;
  conclusionHeadingClass: string;
  conclusionBodyClass: string;
}

export function getConclusionStyles(aipdRequired: boolean): ConclusionStyles {
  if (aipdRequired) {
    return {
      conclusionBoxClass: 'bg-red-50 border-red-200',
      conclusionHeadingClass: 'text-red-800',
      conclusionBodyClass: 'text-red-700',
    };
  }
  return {
    conclusionBoxClass: 'bg-green-50 border-green-200',
    conclusionHeadingClass: 'text-green-800',
    conclusionBodyClass: 'text-green-700',
  };
}

interface ConclusionPanelProps {
  aipdRequired: boolean;
  mainText: string;
  suffix: string;
}

export function ConclusionPanel({
  aipdRequired,
  mainText,
  suffix,
}: Readonly<ConclusionPanelProps>) {
  const { conclusionBoxClass, conclusionHeadingClass, conclusionBodyClass } =
    getConclusionStyles(aipdRequired);
  return (
    <div className="pt-4 border-t">
      <div className={cn('border rounded-lg p-4', conclusionBoxClass)}>
        <h4 className={cn('font-medium', conclusionHeadingClass)}>Conclusion</h4>
        <p className={cn('text-sm mt-1', conclusionBodyClass)}>
          {mainText}
          {' - '}
          {suffix}
        </p>
      </div>
    </div>
  );
}
