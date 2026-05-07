'use client';

import { HelpCircle } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function DpaTooltip() {
  const { t } = useI18n();
  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={t('vendor.dpa.help')}
            className="inline-flex items-center"
            style={{ color: 'var(--ink-3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
          >
            <HelpCircle className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={5}
          className="max-w-xs p-3"
          style={{ backgroundColor: 'var(--surface-2)', color: 'var(--ink)' }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--primary-100)' }}
          >
            {t('vendor.dpa.title')}
          </p>
          <p className="mt-1 text-xs leading-relaxed">{t('vendor.dpa.body')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
