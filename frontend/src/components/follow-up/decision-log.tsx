'use client';

import { useState } from 'react';
import { useDecisions } from '@/lib/follow-up';
import { useI18n } from '@/i18n/context';
import type { EntityType } from '@/lib/follow-up/types';

interface DecisionLogProps {
  entityType: EntityType;
  entityId: string;
}

export function DecisionLog({ entityType, entityId }: DecisionLogProps) {
  const { t } = useI18n();
  const { decisions, loading, error } = useDecisions(entityType, entityId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading)
    return (
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        {t('followUp.decisions.loading')}
      </p>
    );
  if (error)
    return (
      <p className="text-sm text-red-600">
        {t('common.error')}: {error.message}
      </p>
    );
  if (decisions.length === 0)
    return (
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        {t('followUp.decisions.empty')}
      </p>
    );

  return (
    <ol className="space-y-2 text-sm">
      {decisions.map(d => {
        const superseded = d.supersededByDecisionId !== null;
        const cls = superseded ? 'line-through' : '';
        const style = superseded ? { color: 'var(--ink-2)' } : { color: 'var(--ink)' };
        const isExpanded = expandedId === d.id;
        return (
          <li
            key={d.id}
            className="rounded px-3 py-2"
            style={{ borderWidth: '1px', borderColor: 'var(--a30-border)' }}
          >
            <button
              type="button"
              className={`w-full text-left ${cls}`}
              style={style}
              onClick={() => setExpandedId(isExpanded ? null : d.id)}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{d.kind}</span>
                <span className="text-xs">{new Date(d.decidedAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{d.rationale}</p>
            </button>
            {isExpanded && (
              <pre
                className="mt-2 overflow-x-auto rounded p-2 text-xs"
                style={{ backgroundColor: 'var(--surface-2)' }}
              >
                {JSON.stringify(d.inputsSnapshot, null, 2)}
              </pre>
            )}
          </li>
        );
      })}
    </ol>
  );
}
