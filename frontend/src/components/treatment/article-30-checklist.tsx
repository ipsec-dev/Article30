import { Check, X } from 'lucide-react';
import type { TreatmentDto } from '@article30/shared';

interface Article30ChecklistProps {
  treatment: TreatmentDto;
}

type Status = 'ok' | 'missing' | 'na';

interface Row {
  code: string;
  label: string;
  status: Status;
  hint?: string;
}

function rowStatus(condition: boolean): Status {
  return condition ? 'ok' : 'missing';
}

function buildRows(t: TreatmentDto): Row[] {
  // dataCategories is DataCategoryEntry[] | null — guard against null
  const dataCategories = t.dataCategories ?? [];
  // transfers is TransferEntry[] | null — guard against null
  const hasTransfers = Array.isArray(t.transfers) && t.transfers.length > 0;

  return [
    {
      code: 'Art. 30(1)(a)',
      label: 'Responsable du traitement',
      status: 'ok',
      hint: 'Identifié par le compte propriétaire',
    },
    {
      code: 'Art. 30(1)(b)',
      label: 'Coordonnées du DPO',
      // TODO: when TreatmentDto/Organization schema gains DPO contact fields,
      // derive status from the actual DPO presence rather than hardcoding 'na'.
      status: 'na',
      hint: "Définies au niveau de l'organisation",
    },
    {
      code: 'Art. 30(1)(c)',
      label: 'Finalités du traitement',
      status: rowStatus(Boolean(t.purpose && t.legalBasis)),
      hint: t.purpose ?? undefined,
    },
    {
      code: 'Art. 30(1)(d)',
      label: 'Catégories de personnes & de données',
      status: rowStatus(t.personCategories.length > 0 && dataCategories.length > 0),
      hint: `${t.personCategories.length} pers. · ${dataCategories.length} données`,
    },
    {
      code: 'Art. 30(1)(e)',
      label: 'Catégories de destinataires',
      status: rowStatus(t.recipientTypes.length > 0),
      hint: t.recipientTypes.length > 0 ? `${t.recipientTypes.length} destinataire(s)` : undefined,
    },
    {
      code: 'Art. 30(1)(f)',
      label: 'Transferts hors UE',
      status: rowStatus(hasTransfers),
      hint: hasTransfers ? 'Transferts déclarés' : 'Aucun transfert',
    },
    {
      code: 'Art. 30(1)(g)',
      label: 'Délais de conservation',
      status: rowStatus(Boolean(t.retentionPeriod && t.retentionPeriod.length > 0)),
      hint: t.retentionPeriod ?? undefined,
    },
  ];
}

const STATUS_LABEL: Record<Status, string> = {
  ok: 'Renseigné',
  missing: 'Manquant',
  na: 'N/A',
};

const STATUS_COLOR: Record<Status, string> = {
  ok: 'var(--success)',
  missing: 'var(--danger)',
  na: 'var(--ink-3)',
};

export function Article30Checklist({ treatment }: Article30ChecklistProps) {
  const rows = buildRows(treatment);
  const satisfied = rows.filter(r => r.status === 'ok').length;
  const total = rows.filter(r => r.status !== 'na').length;

  return (
    <aside className="a30-card overflow-hidden" aria-label="Conformité Article 30">
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--a30-border)' }}>
        <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
          Article 30 RGPD
        </div>
        <div className="mt-1 text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
          {satisfied} / {total} renseignés
        </div>
      </div>
      <ul>
        {rows.map((row, i) => {
          const Icon = row.status === 'ok' ? Check : row.status === 'missing' ? X : null;
          return (
            <li
              key={row.code}
              className="flex items-start gap-3 px-4 py-3"
              style={{ borderTop: i ? '1px solid var(--a30-border)' : 'none' }}
            >
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10.5px]" style={{ color: 'var(--ink-3)' }}>
                  {row.code}
                </div>
                <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                  {row.label}
                </div>
                {row.hint && (
                  <div className="mt-0.5 truncate text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                    {row.hint}
                  </div>
                )}
              </div>
              <div
                className="flex shrink-0 items-center gap-1.5 text-[11px]"
                style={{ color: STATUS_COLOR[row.status] }}
              >
                {Icon && <Icon aria-hidden="true" className="size-3.5" />}
                <span>{STATUS_LABEL[row.status]}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
