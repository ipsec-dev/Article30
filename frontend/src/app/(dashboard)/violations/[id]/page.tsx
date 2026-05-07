'use client';

import { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/dates';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useFetch } from '@/lib/hooks/use-fetch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DocumentList } from '@/components/domain/document-list';
import { FollowUpPanel } from '@/components/follow-up/follow-up-panel';
import { WorkflowTab } from '@/components/violations/workflow-tab';
import { RiskPanel } from '@/components/violations/risk-panel';
import { FilingsPanel } from '@/components/violations/filings-panel';
import { RegulatorPanel } from '@/components/violations/regulator-panel';
import { ActionItemsPanel } from '@/components/violations/action-items-panel';
import { Role, Severity, ViolationStatus, WRITE_ROLES, DELETE_ROLES } from '@article30/shared';
import type { ViolationDto } from '@article30/shared';

const NO_RESULTS_KEY = 'common.noResults';

const SEVERITY_COLORS: Record<Severity, string> = {
  [Severity.LOW]: 'bg-green-100 text-green-800',
  [Severity.MEDIUM]: 'bg-amber-100 text-amber-800',
  [Severity.HIGH]: 'bg-red-100 text-red-800',
  [Severity.CRITICAL]: 'bg-red-200 text-red-900',
};

function getStatusBadgeClass(status: ViolationStatus): string {
  if (status === ViolationStatus.CLOSED) {
    return 'bg-green-100 text-green-800';
  }
  return 'bg-blue-100 text-blue-800';
}

type HeaderActionsProps = Readonly<{
  canWrite: boolean;
  canDelete: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}>;

function HeaderActions({ canWrite, canDelete, onBack, onEdit, onDelete, t }: HeaderActionsProps) {
  return (
    <>
      <Button variant="outline" size="sm" onClick={onBack}>
        {t('common.back')}
      </Button>
      {canWrite && (
        <Button size="sm" onClick={onEdit}>
          {t('common.edit')}
        </Button>
      )}
      {canDelete && (
        <Button variant="destructive" size="sm" onClick={onDelete}>
          {t('common.delete')}
        </Button>
      )}
    </>
  );
}

type OverviewCardProps = Readonly<{
  violation: ViolationDto;
  t: (key: string) => string;
}>;

function OverviewCard({ violation, t }: OverviewCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
            {violation.title}
          </h2>
          <Badge className={SEVERITY_COLORS[violation.severity]}>
            {t(`violation.severity.${violation.severity}`)}
          </Badge>
          <Badge className={getStatusBadgeClass(violation.status)}>
            {t(`violation.status.${violation.status}`)}
          </Badge>
        </div>
        {violation.description && (
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            {violation.description}
          </p>
        )}
        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
              {t('violation.awarenessAt')}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
              {formatDate(violation.awarenessAt)}
            </p>
          </div>
          {violation.assignedTo && (
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
                {t('violation.assignedTo')}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
                {violation.assignedTo}
              </p>
            </div>
          )}
          {violation.closedAt && (
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
                {t('violation.status.CLOSED')}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
                {formatDate(violation.closedAt)}
              </p>
            </div>
          )}
          {violation.closureReason && (
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
                {t('violation.closureReason')}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
                {violation.closureReason}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingView() {
  return (
    <div className="mt-8 flex justify-center">
      <div
        className="size-8 animate-spin rounded-full border-4"
        style={{
          borderColor: 'var(--a30-border)',
          borderTopColor: 'var(--primary)',
        }}
      />
    </div>
  );
}

export default function ViolationDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { user } = useCurrentUser();
  const { data: violation, loading } = useFetch<ViolationDto>(`/violations/${id}`);

  const canWrite = Boolean(user && (WRITE_ROLES as readonly Role[]).includes(user.role));
  const canDelete = Boolean(user && (DELETE_ROLES as readonly Role[]).includes(user.role));

  const handleBack = useCallback(() => {
    router.push('/violations');
  }, [router]);

  const handleEdit = useCallback(() => {
    router.push(`/violations/${id}/edit`);
  }, [router, id]);

  const handleDelete = useCallback(async () => {
    if (!confirm(t('common.confirmDelete'))) {
      return;
    }
    try {
      await api.delete(`/violations/${id}`);
      router.push('/violations');
    } catch {}
  }, [id, router, t]);

  if (loading) {
    return <LoadingView />;
  }

  if (!violation) {
    return (
      <p className="mt-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
        {t(NO_RESULTS_KEY)}
      </p>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HeaderActions
            canWrite={canWrite}
            canDelete={canDelete}
            onBack={handleBack}
            onEdit={handleEdit}
            onDelete={handleDelete}
            t={t}
          />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <OverviewCard violation={violation} t={t} />

        <DocumentList linkedEntity="VIOLATION" linkedEntityId={id} />

        <FollowUpPanel entityType="VIOLATION" entityId={violation.id} />

        <WorkflowTab violationId={violation.id} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RiskPanel violationId={violation.id} />
          <FilingsPanel violationId={violation.id} />
          <RegulatorPanel violationId={violation.id} />
          <ActionItemsPanel violationId={violation.id} />
        </div>
      </div>
    </div>
  );
}
