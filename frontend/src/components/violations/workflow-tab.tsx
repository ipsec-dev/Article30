'use client';

import { useState } from 'react';
import { getAvailableTransitions, type ViolationStateMachineStatus } from '@article30/shared';
import { Button } from '@/components/ui/button';
import { useViolationDetail } from '@/lib/violations';
import { useI18n } from '@/i18n/context';
import { StateStrip } from './state-strip';
import { TransitionModal } from './transition-modal';
import { DecisionLog } from '@/components/follow-up/decision-log';

interface WorkflowTabProps {
  violationId: string;
}

export function WorkflowTab({ violationId }: WorkflowTabProps) {
  const { t } = useI18n();
  const { violation, loading, error, transition } = useViolationDetail(violationId);
  const [modalTarget, setModalTarget] = useState<ViolationStateMachineStatus | null>(null);

  if (loading)
    return (
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        {t('common.loading')}
      </p>
    );
  if (error)
    return (
      <p className="text-sm text-red-600">
        {t('common.error')}: {error.message}
      </p>
    );
  if (!violation) return null;

  const current = violation.status as ViolationStateMachineStatus;
  const available = getAvailableTransitions(current);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
          {t('violation.workflow.title')}
        </h3>
        <div className="mt-2">
          <StateStrip current={current} />
        </div>
      </div>

      {available.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase" style={{ color: 'var(--ink-3)' }}>
            {t('violation.workflow.availableTransitions')}
          </h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {available.map(s => (
              <Button
                key={s}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalTarget(s)}
              >
                → {t(`violation.state.${s}`)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-medium uppercase" style={{ color: 'var(--ink-3)' }}>
          {t('violation.workflow.decisions')}
        </h4>
        <div className="mt-2">
          <DecisionLog entityType="VIOLATION" entityId={violationId} />
        </div>
      </div>

      {modalTarget && (
        <TransitionModal
          open={true}
          onClose={() => setModalTarget(null)}
          current={current}
          target={modalTarget}
          onSubmit={async (target, payload) => {
            await transition(target, payload);
          }}
        />
      )}
    </section>
  );
}
