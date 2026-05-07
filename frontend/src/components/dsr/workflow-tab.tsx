'use client';

import { useState } from 'react';
import { getDsrAvailableTransitions, type DsrStateMachineStatus } from '@article30/shared';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/context';
import { useDsrDetail } from '@/lib/dsr';
import { DecisionLog } from '@/components/follow-up/decision-log';
import { DsrStateStrip } from './state-strip';
import { DsrTransitionModal } from './transition-modal';

interface DsrWorkflowTabProps {
  dsrId: string;
}

export function DsrWorkflowTab({ dsrId }: DsrWorkflowTabProps) {
  const { t } = useI18n();
  const { dsr, loading, error, transition } = useDsrDetail(dsrId);
  const [modalTarget, setModalTarget] = useState<DsrStateMachineStatus | null>(null);

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
  if (!dsr) return null;

  const current = dsr.status;
  const available = getDsrAvailableTransitions(current);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
          {t('dsr.workflow.title')}
        </h3>
        <div className="mt-2">
          <DsrStateStrip current={current} />
        </div>
      </div>

      {available.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase" style={{ color: 'var(--ink-3)' }}>
            {t('dsr.workflow.availableTransitions')}
          </h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {available.map(target => (
              <Button
                key={target}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalTarget(target)}
              >
                → {t(`dsr.state.${target}`)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-medium uppercase" style={{ color: 'var(--ink-3)' }}>
          {t('dsr.workflow.decisions')}
        </h4>
        <div className="mt-2">
          <DecisionLog entityType="DSR" entityId={dsrId} />
        </div>
      </div>

      {modalTarget && (
        <DsrTransitionModal
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
