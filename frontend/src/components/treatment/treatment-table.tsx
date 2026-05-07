import Link from 'next/link';
import type { ReactNode } from 'react';
import { CheckCircle2, Download, Edit2, Trash2 } from 'lucide-react';
import type { TreatmentDto } from '@article30/shared';
import { TreatmentStatus } from '@article30/shared';
import { StatusDot, type StatusKind } from '@/components/a30/status-dot';
import { EmptyState } from '@/components/a30/empty-state';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/i18n/context';

interface TreatmentRowActions {
  onEdit?: (treatment: TreatmentDto) => void;
  onExportPdf?: (treatment: TreatmentDto) => void;
  onMarkReviewed?: (treatment: TreatmentDto) => void;
  onDelete?: (treatment: TreatmentDto) => void;
}

interface TreatmentTableProps {
  treatments: TreatmentDto[];
  onRowClick?: (treatment: TreatmentDto) => void;
  actions?: TreatmentRowActions;
}

const STATUS_LABEL: Record<TreatmentStatus, { kind: StatusKind; label: string }> = {
  [TreatmentStatus.VALIDATED]: { kind: 'success', label: 'Validé' },
  [TreatmentStatus.DRAFT]: { kind: 'neutral', label: 'Brouillon' },
};

const FRESHNESS_LABEL: Record<string, { kind: StatusKind; label: string }> = {
  FRESH: { kind: 'success', label: 'À jour' },
  PENDING_REVIEW: { kind: 'warn', label: 'En revue' },
  OUTDATED: { kind: 'danger', label: 'Obsolète' },
};

function freshnessFor(t: TreatmentDto): { kind: StatusKind; label: string } {
  const s = t.indicators?.freshnessStatus;
  if (s && FRESHNESS_LABEL[s]) return FRESHNESS_LABEL[s];
  return { kind: 'neutral', label: '—' };
}

function relativeDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const HEADER_CLASS = 'px-4 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide';

interface ActionIconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

function ActionIconButton({ label, onClick, children }: Readonly<ActionIconButtonProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="rounded p-1 hover:bg-[var(--surface-2)]"
          onClick={e => {
            e.stopPropagation();
            onClick();
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function TreatmentTable({ treatments, onRowClick, actions }: TreatmentTableProps) {
  const { t } = useI18n();
  const hasActions =
    Boolean(actions?.onEdit) ||
    Boolean(actions?.onExportPdf) ||
    Boolean(actions?.onMarkReviewed) ||
    Boolean(actions?.onDelete);

  if (treatments.length === 0) {
    return (
      <EmptyState
        title="Aucun traitement"
        body="Créez votre premier traitement pour commencer à construire votre registre."
        action={
          <Link
            href="/register/new"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center rounded-md px-3 py-2 text-[13px] font-medium"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-fg)',
              border: '1px solid var(--primary-600)',
            }}
          >
            Créer un traitement
          </Link>
        }
      />
    );
  }

  return (
    <div className="a30-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th className={HEADER_CLASS} style={{ color: 'var(--ink-3)' }}>
                Réf.
              </th>
              <th className={HEADER_CLASS} style={{ color: 'var(--ink-3)' }}>
                Nom
              </th>
              <th className={HEADER_CLASS} style={{ color: 'var(--ink-3)' }}>
                Statut
              </th>
              <th className={HEADER_CLASS} style={{ color: 'var(--ink-3)' }}>
                Fraîcheur
              </th>
              <th className={HEADER_CLASS} style={{ color: 'var(--ink-3)' }}>
                Modifié
              </th>
              {hasActions && (
                <th className={HEADER_CLASS} style={{ color: 'var(--ink-3)' }}>
                  {t('common.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {treatments.map((row, i) => {
              const status = STATUS_LABEL[row.status] ?? {
                kind: 'neutral' as StatusKind,
                label: row.status,
              };
              const freshness = freshnessFor(row);
              const handleClick = () => onRowClick?.(row);
              return (
                <tr
                  key={row.id}
                  onClick={handleClick}
                  className="transition-colors hover:bg-[var(--surface-2)]"
                  style={{
                    borderTop: i ? '1px solid var(--a30-border)' : 'none',
                    cursor: onRowClick ? 'pointer' : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    <span className="num font-mono text-[12px]" style={{ color: 'var(--ink-3)' }}>
                      {row.refNumber !== null && row.refNumber !== undefined
                        ? `#${row.refNumber}`
                        : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/register/${row.id}`}
                      onClick={e => e.stopPropagation()}
                      className="font-medium hover:underline"
                      style={{ color: 'var(--ink)' }}
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusDot kind={status.kind}>{status.label}</StatusDot>
                  </td>
                  <td className="px-4 py-3">
                    <StatusDot kind={freshness.kind}>{freshness.label}</StatusDot>
                  </td>
                  <td className="num px-4 py-3 text-[12px]" style={{ color: 'var(--ink-3)' }}>
                    {relativeDate(row.updatedAt)}
                  </td>
                  {hasActions && (
                    <td className="px-4 py-3">
                      <TooltipProvider delayDuration={150}>
                        <div className="flex items-center gap-1">
                          {actions?.onEdit && (
                            <ActionIconButton
                              label={t('common.edit')}
                              onClick={() => actions.onEdit?.(row)}
                            >
                              <Edit2 className="size-3.5" style={{ color: 'var(--ink-2)' }} />
                            </ActionIconButton>
                          )}
                          {actions?.onExportPdf && (
                            <ActionIconButton
                              label={t('register.exportPdf')}
                              onClick={() => actions.onExportPdf?.(row)}
                            >
                              <Download className="size-3.5" style={{ color: 'var(--ink-2)' }} />
                            </ActionIconButton>
                          )}
                          {actions?.onMarkReviewed && (
                            <ActionIconButton
                              label={t('register.markAsReviewed')}
                              onClick={() => actions.onMarkReviewed?.(row)}
                            >
                              <CheckCircle2
                                className="size-3.5"
                                style={{ color: 'var(--ink-2)' }}
                              />
                            </ActionIconButton>
                          )}
                          {actions?.onDelete && (
                            <ActionIconButton
                              label={t('common.delete')}
                              onClick={() => actions.onDelete?.(row)}
                            >
                              <Trash2 className="size-3.5 text-red-500" />
                            </ActionIconButton>
                          )}
                        </div>
                      </TooltipProvider>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
