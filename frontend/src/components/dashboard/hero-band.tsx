'use client';

import Link from 'next/link';
import { Download, Plus, Shield } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeroBandProps {
  greetingName: string;
  isAdmin: boolean;
  onDownloadReport?: () => void;
  onDownloadAuditPackage?: () => void;
}

function formatToday(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function HeroBand({
  greetingName,
  isAdmin,
  onDownloadReport,
  onDownloadAuditPackage,
}: HeroBandProps) {
  const { t } = useI18n();
  const today = formatToday();
  return (
    <div>
      <div className="mb-2 text-[11px]" style={{ color: 'var(--ink-3)' }}>
        {today}
      </div>
      <h1 className="text-[22px] font-semibold leading-tight" style={{ color: 'var(--ink)' }}>
        Bonjour{greetingName ? ` ${greetingName}` : ''}.
      </h1>
      <p className="mt-1 text-[22px] leading-tight" style={{ color: 'var(--ink-3)' }}>
        Voici l&apos;état actuel de votre registre.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-medium"
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-fg)',
            border: '1px solid var(--primary-600)',
          }}
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Nouveau traitement
        </Link>
        {isAdmin && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onDownloadReport}
                  className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-medium"
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    border: '1px solid var(--border-2)',
                  }}
                >
                  <Download aria-hidden="true" className="size-3.5" />
                  {t('dashboard.exportReport.label')}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {t('dashboard.exportReport.tooltip')}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onDownloadAuditPackage}
                  className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-medium"
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    border: '1px solid var(--border-2)',
                  }}
                >
                  <Shield aria-hidden="true" className="size-3.5" />
                  {t('dashboard.auditPack.label')}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {t('dashboard.auditPack.tooltip')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
