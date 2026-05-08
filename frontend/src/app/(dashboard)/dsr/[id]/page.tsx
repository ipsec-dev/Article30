'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/dates';
import { getMe } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FollowUpPanel } from '@/components/follow-up/follow-up-panel';
import { DsrWorkflowTab } from '@/components/dsr/workflow-tab';
import { DeadlinePill } from '@/components/dsr/deadline-pill';
import { PausesPanel } from '@/components/dsr/pauses-panel';
import { TreatmentProcessingPanel } from '@/components/dsr/treatment-processing-panel';
import { CommunicationsPanel } from '@/components/dsr/communications-panel';
import { SLABar } from '@/components/dsr/sla-bar';
import { StatusDot } from '@/components/a30/status-dot';
import type { StatusKind } from '@/components/a30/status-dot';
import { usePauses } from '@/lib/dsr/use-pauses';
import { Role, DsrStatus, DSR_ROLES, DELETE_ROLES } from '@article30/shared';
import type { DataSubjectRequestDto, UserDto } from '@article30/shared';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const NO_RESULTS_KEY = 'common.noResults';
const YES_KEY = 'common.yes';
const NO_KEY = 'common.no';

const STATUS_KIND: Record<DsrStatus, StatusKind> = {
  [DsrStatus.RECEIVED]: 'info',
  [DsrStatus.ACKNOWLEDGED]: 'info',
  [DsrStatus.IDENTITY_VERIFIED]: 'primary',
  [DsrStatus.IN_PROGRESS]: 'warn',
  [DsrStatus.AWAITING_REQUESTER]: 'warn',
  [DsrStatus.RESPONDED]: 'success',
  [DsrStatus.PARTIALLY_FULFILLED]: 'success',
  [DsrStatus.REJECTED]: 'danger',
  [DsrStatus.WITHDRAWN]: 'neutral',
  [DsrStatus.CLOSED]: 'neutral',
};

type RequesterCardProps = Readonly<{
  dsr: DataSubjectRequestDto;
  identityIndicator: React.ReactNode;
  t: (key: string) => string;
}>;

function RequesterCard({ dsr, identityIndicator, t }: RequesterCardProps) {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('dsr.requesterName')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {dsr.requesterName}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('dsr.requesterEmail')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {dsr.requesterEmail}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('dsr.identityVerified')}
          </p>
          <p className="mt-1 text-sm">{identityIndicator}</p>
        </div>
        {dsr.identityNotes && (
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
              {t('dsr.identityNotes')}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
              {dsr.identityNotes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type DetailsCardProps = Readonly<{
  dsr: DataSubjectRequestDto;
  t: (key: string) => string;
}>;

function DetailsCard({ dsr, t }: DetailsCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        {dsr.description && (
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
              {t('dsr.description')}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
              {dsr.description}
            </p>
          </div>
        )}
        {dsr.affectedSystems && (
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
              {t('dsr.affectedSystems')}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
              {dsr.affectedSystems}
            </p>
          </div>
        )}
        {dsr.assignee && (
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
              {t('dsr.assignedTo')}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
              {`${dsr.assignee.firstName} ${dsr.assignee.lastName}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type ResponseCardProps = Readonly<{
  dsr: DataSubjectRequestDto;
  t: (key: string) => string;
}>;

function ResponseCard({ dsr, t }: ResponseCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        {dsr.responseNotes && (
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
              {t('dsr.responseNotes')}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
              {dsr.responseNotes}
            </p>
          </div>
        )}
        {dsr.respondedAt && (
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
              Répondue le
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
              {formatDate(dsr.respondedAt)}
            </p>
          </div>
        )}
        {dsr.closureReason && (
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
              {t('dsr.closureReason')}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
              {dsr.closureReason}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type DeadlineInfo = {
  display: string;
  className: string;
};

function computeDeadlineInfo(
  dsr: DataSubjectRequestDto,
  effectiveDeadline: string,
  t: (key: string) => string,
): DeadlineInfo {
  const daysRemaining = Math.ceil(
    (new Date(effectiveDeadline).getTime() - Date.now()) / MS_PER_DAY,
  );
  const isOverdue =
    daysRemaining < 0 && dsr.status !== DsrStatus.RESPONDED && dsr.status !== DsrStatus.CLOSED;

  let display: string;
  if (isOverdue) {
    display = t('dsr.daysOverdue').replace('{{count}}', String(Math.abs(daysRemaining)));
  } else {
    display = t('dsr.daysRemaining').replace('{{count}}', String(daysRemaining));
  }

  const className = isOverdue ? 'text-sm font-medium text-red-600' : 'text-sm';

  return { display, className };
}

type IdentityIndicatorProps = Readonly<{
  verified: boolean;
  t: (key: string) => string;
}>;

function IdentityIndicator({ verified, t }: IdentityIndicatorProps) {
  if (verified) {
    return <StatusDot kind="success">{t(YES_KEY)}</StatusDot>;
  }
  return <StatusDot kind="neutral">{t(NO_KEY)}</StatusDot>;
}

type DsrStatusHeaderCardProps = Readonly<{
  dsr: DataSubjectRequestDto;
  deadlineInfo: DeadlineInfo;
  t: (key: string) => string;
}>;

function DsrStatusHeaderCard({ dsr, deadlineInfo, t }: DsrStatusHeaderCardProps) {
  const showDeadline = dsr.status !== DsrStatus.RESPONDED && dsr.status !== DsrStatus.CLOSED;
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 pt-4">
        <Badge style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary)' }}>
          {t(`dsr.type.${dsr.type}`)}
        </Badge>
        <StatusDot kind={STATUS_KIND[dsr.status]}>{t(`dsr.status.${dsr.status}`)}</StatusDot>
        {showDeadline && (
          <span className={deadlineInfo.className} style={{ color: 'var(--ink-2)' }}>
            {deadlineInfo.display}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

type DsrPageActionsProps = Readonly<{
  canAccess: boolean;
  canDelete: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}>;

function DsrPageActions({
  canAccess,
  canDelete,
  onBack,
  onEdit,
  onDelete,
  t,
}: DsrPageActionsProps) {
  return (
    <>
      <Button variant="outline" size="sm" onClick={onBack}>
        {t('common.back')}
      </Button>
      {canAccess && (
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

function hasResponseInfo(dsr: DataSubjectRequestDto): boolean {
  return Boolean(dsr.responseNotes || dsr.respondedAt || dsr.closureReason);
}

type DsrMetaCardProps = Readonly<{
  dsr: DataSubjectRequestDto;
  effectiveDeadline: string;
  t: (key: string) => string;
}>;

function DsrMetaCard({ dsr, effectiveDeadline, t }: DsrMetaCardProps) {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('common.createdAt')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {formatDate(dsr.createdAt)}
          </p>
        </div>
        {dsr.creator && (
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
              {t('common.createdBy')}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
              {`${dsr.creator.firstName} ${dsr.creator.lastName}`}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {t('dsr.deadline')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
            {formatDate(effectiveDeadline)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DsrDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { pauses } = usePauses(id);
  const [user, setUser] = useState<UserDto | null>(null);
  const [dsr, setDsr] = useState<DataSubjectRequestDto | null>(null);
  const [loading, setLoading] = useState(true);

  const canAccess = user && (DSR_ROLES as readonly Role[]).includes(user.role);
  const canDelete = user && (DELETE_ROLES as readonly Role[]).includes(user.role);

  useEffect(() => {
    getMe().then(u => setUser(u));
  }, []);

  async function fetchDsr() {
    try {
      const res = await api.get<DataSubjectRequestDto>(`/dsr/${id}`);
      setDsr(res);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canAccess) {
      return;
    }
    fetchDsr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, canAccess]);

  const handleBack = useCallback(() => {
    router.push('/dsr');
  }, [router]);

  const handleEdit = useCallback(() => {
    router.push(`/dsr/${id}/edit`);
  }, [router, id]);

  const handleDelete = useCallback(async () => {
    if (!confirm(t('common.confirmDelete'))) {
      return;
    }
    try {
      await api.delete(`/dsr/${id}`);
      router.push('/dsr');
    } catch {}
  }, [id, router, t]);

  if (user && !canAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-medium" style={{ color: 'var(--ink)' }}>
              {t('dsr.accessDenied.title')}
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-2)' }}>
              {t('dsr.accessDenied.body')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-8 flex justify-center">
        <div
          className="size-8 animate-spin rounded-full border-4"
          style={{ borderColor: 'var(--a30-border)', borderTopColor: 'var(--primary)' }}
        />
      </div>
    );
  }

  if (!dsr) {
    return (
      <p className="mt-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
        {t(NO_RESULTS_KEY)}
      </p>
    );
  }

  const effectiveDeadline = dsr.deadline;
  const deadlineInfo = computeDeadlineInfo(dsr, effectiveDeadline, t);
  const identityIndicator = <IdentityIndicator verified={dsr.identityVerified} t={t} />;

  return (
    <div className="space-y-4">
      {/* Action row — back / edit / delete (Topbar owns the title) */}
      <div className="flex items-center gap-2">
        <DsrPageActions
          canAccess={Boolean(canAccess)}
          canDelete={Boolean(canDelete)}
          onBack={handleBack}
          onEdit={handleEdit}
          onDelete={handleDelete}
          t={t}
        />
      </div>

      {/* SLA header card — prominent deadline visualisation */}
      <Card>
        <CardContent className="pt-4">
          <SLABar deadline={dsr.deadline} startedAt={dsr.receivedAt} />
        </CardContent>
      </Card>

      {/* Deadline pill */}
      <div>
        <DeadlinePill deadline={dsr.deadline} status={dsr.status} pauses={pauses} />
      </div>

      {/* Header card: type + status + deadline */}
      <DsrStatusHeaderCard dsr={dsr} deadlineInfo={deadlineInfo} t={t} />

      {/* Requester card */}
      <RequesterCard dsr={dsr} identityIndicator={identityIndicator} t={t} />

      {/* Details card */}
      <DetailsCard dsr={dsr} t={t} />

      {/* Response card */}
      {hasResponseInfo(dsr) && <ResponseCard dsr={dsr} t={t} />}

      {/* Meta */}
      <DsrMetaCard dsr={dsr} effectiveDeadline={effectiveDeadline} t={t} />

      {dsr && <DsrWorkflowTab dsrId={dsr.id} />}

      {/* Domain panels */}
      <Card>
        <CardContent className="pt-4">
          <PausesPanel dsrId={dsr.id} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <TreatmentProcessingPanel dsrId={dsr.id} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <CommunicationsPanel dsrId={dsr.id} />
        </CardContent>
      </Card>

      <FollowUpPanel entityType="DSR" entityId={dsr.id} />
    </div>
  );
}
