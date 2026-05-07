import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSubjectRequest, DecisionKind, DsrStatus, Prisma } from '@prisma/client';
import { DsrStatus as SharedDsrStatus, DSR_TERMINAL_STATUSES } from '@article30/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PRISMA_SELECT } from '../../common/prisma/select-shapes';
import { emailHash } from '../../common/logging/email-hash';
import { CreateDsrDto } from './dto/create-dsr.dto';
import { UpdateDsrDto } from './dto/update-dsr.dto';
import { SubmitDsrDto } from './dto/submit-dsr.dto';
import { computeDeadline } from '../../common/deadlines';
import { acquireXactLock } from '../../common/pg-locks';
import { EntityValidator } from '../follow-up/entity-validator';
import { DecisionsService } from '../follow-up/decisions.service';
import { DsrPauseService } from './dsr-pause.service';
import { NotificationService } from '../notifications/notification.service';
import { loadNotificationContext } from '../notifications/notification-context';
import { formatDsrType, formatDateLocale, shortRef, MS_PER_DAY } from '../notifications/format';
import { resolveRecipientLocale } from '../notifications/locale-resolver';
import { validateTransition } from './state-machine';
import {
  DSR_TRANSITION_VALIDATORS,
  DsrTransitionPayloadError,
  ValidatedAwaitingRequesterPayload,
  ValidatedRespondedPayload,
  ValidatedPartiallyFulfilledPayload,
  ValidatedRejectedPayload,
  ValidatedWithdrawnPayload,
} from './transition-validators';

const INCLUDE_RELATIONS = {
  creator: { select: PRISMA_SELECT.userRef },
  assignee: { select: PRISMA_SELECT.userRef },
};

const DEFAULT_PAGE_SIZE = 20;

function formatDsr<T extends object>(dsr: T) {
  return dsr;
}

export interface TransitionInput {
  dsrId: string;
  target: DsrStatus;
  payload: unknown;
  performedBy: string;
}

function mapTransitionToDecisionKind(target: DsrStatus): DecisionKind | null {
  if (target === 'REJECTED') return 'REJECT_DSR';
  if (target === 'PARTIALLY_FULFILLED') return 'CLOSE_DSR_PARTIAL';
  return null;
}

function extractRationale(target: DsrStatus, payload: unknown): string {
  if (target === 'REJECTED') {
    const p = payload as ValidatedRejectedPayload;
    return `${p.rejectionReason}: ${p.rejectionDetails}`;
  }
  if (target === 'PARTIALLY_FULFILLED') {
    const p = payload as ValidatedPartiallyFulfilledPayload;
    return p.partialFulfilmentNotes;
  }
  return '';
}

@Injectable()
export class DsrService {
  private readonly logger = new Logger(DsrService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidator: EntityValidator,
    private readonly decisions: DecisionsService,
    private readonly dsrPauseService: DsrPauseService,
    private readonly notifications: NotificationService,
  ) {}

  async findAll(
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    filters?: { status?: SharedDsrStatus; type?: string; overdue?: boolean },
  ) {
    const where: Record<string, unknown> = {};
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.overdue) {
      where.deadline = { lt: new Date() };
      where.status = { notIn: DSR_TERMINAL_STATUSES as unknown as SharedDsrStatus[] };
    }

    const [data, total] = await Promise.all([
      this.prisma.dataSubjectRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { receivedAt: 'desc' },
        include: INCLUDE_RELATIONS,
      }),
      this.prisma.dataSubjectRequest.count({ where }),
    ]);

    return { data: data.map(formatDsr), total, page, limit };
  }

  async findOne(id: string) {
    const dsr = await this.prisma.dataSubjectRequest.findFirst({
      where: { id },
      include: INCLUDE_RELATIONS,
    });
    if (!dsr) {
      throw new NotFoundException('DSR not found');
    }
    return formatDsr(dsr);
  }

  async create(dto: CreateDsrDto, userId: string) {
    const now = new Date();
    const dsr = await this.prisma.dataSubjectRequest.create({
      data: {
        ...dto,
        receivedAt: now,
        deadline: computeDeadline({ profile: 'DSR_STANDARD_30D', anchorAt: now }).baseDeadline,
        createdBy: userId,
      },
      include: INCLUDE_RELATIONS,
    });
    this.logger.log({
      event: 'dsr.created',
      dsrId: dsr.id,
      dsrType: dsr.type,
      userId,
    });

    await this.emitSubmittedNotification(dsr);

    return formatDsr(dsr);
  }

  private async emitSubmittedNotification(dsr: DataSubjectRequest): Promise<void> {
    // Instant-notification side-effects must never fail the user-facing
    // operation: the DSR row is already persisted when we get here.
    try {
      const { org, assignee } = await loadNotificationContext(this.prisma, dsr.assignedTo);
      const locale = resolveRecipientLocale(org?.locale ?? null);
      const remainingDays = Math.max(
        0,
        Math.round((dsr.deadline.getTime() - Date.now()) / MS_PER_DAY),
      );
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      await this.notifications.notify({
        kind: 'dsr.submitted',
        recordId: dsr.id,
        assigneeEmail: assignee?.email ?? null,
        orgDpoEmail: org?.dpoEmail ?? null,
        orgLocale: org?.locale ?? 'fr',
        orgCompanyName: org?.companyName ?? '',
        recipientRole: assignee ? 'assignee' : 'dpo',
        context: {
          recipientFirstName: assignee?.firstName ?? org?.dpoName ?? '',
          dsrTypeLabel: formatDsrType(dsr.type, locale),
          requesterName: dsr.requesterName,
          requesterEmail: dsr.requesterEmail,
          receivedDate: formatDateLocale(dsr.receivedAt, locale),
          deadlineDate: formatDateLocale(dsr.deadline, locale),
          leadTimeLabel: locale === 'fr' ? `${remainingDays} jours` : `${remainingDays} days`,
          shortRef: shortRef('DSR', dsr.id),
          recordUrl: `${frontendUrl}/dsr/${dsr.id}`,
        },
      });
    } catch (err) {
      this.logger.error({
        event: 'notification.failed',
        kind: 'dsr.submitted',
        recordId: dsr.id,
        err,
      });
    }
  }

  async submit(dto: SubmitDsrDto) {
    const now = new Date();
    const dsr = await this.prisma.dataSubjectRequest.create({
      data: {
        type: dto.type,
        requesterName: dto.requesterName,
        requesterEmail: dto.requesterEmail,
        description: dto.description,
        receivedAt: now,
        deadline: computeDeadline({ profile: 'DSR_STANDARD_30D', anchorAt: now }).baseDeadline,
      },
    });
    this.logger.log({
      event: 'dsr.public.submitted',
      dsrId: dsr.id,
      dsrType: dsr.type,
      emailHash: emailHash(dto.requesterEmail),
    });
    return { id: dsr.id, deadline: dsr.deadline };
  }

  async update(id: string, dto: UpdateDsrDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = { ...dto };
    const updatedDsr = await this.prisma.dataSubjectRequest.update({
      data,
      where: { id },
      include: INCLUDE_RELATIONS,
    });
    this.logger.debug({ event: 'dsr.updated', dsrId: id });
    return formatDsr(updatedDsr);
  }

  async delete(id: string) {
    await this.findOne(id);
    await this.prisma.dataSubjectRequest.delete({ where: { id } });
    this.logger.log({ event: 'dsr.deleted', dsrId: id });
  }

  async getStats() {
    const [all, overdue, thisMonth] = await Promise.all([
      this.prisma.dataSubjectRequest.findMany({
        select: { type: true, status: true, receivedAt: true, respondedAt: true },
      }),
      this.prisma.dataSubjectRequest.count({
        where: {
          deadline: { lt: new Date() },
          status: { notIn: DSR_TERMINAL_STATUSES as unknown as DsrStatus[] },
        },
      }),
      this.prisma.dataSubjectRequest.count({
        where: {
          receivedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalResponseDays = 0;
    let respondedCount = 0;

    const MS_PER_DAY = 86_400_000;
    for (const dsr of all) {
      byStatus[dsr.status] = (byStatus[dsr.status] || 0) + 1;
      byType[dsr.type] = (byType[dsr.type] || 0) + 1;
      if (dsr.respondedAt) {
        totalResponseDays += (dsr.respondedAt.getTime() - dsr.receivedAt.getTime()) / MS_PER_DAY;
        respondedCount++;
      }
    }

    let avgResponseDays: number;
    if (respondedCount > 0) {
      avgResponseDays = Math.round(totalResponseDays / respondedCount);
    } else {
      avgResponseDays = 0;
    }

    return {
      total: all.length,
      byStatus,
      byType,
      overdue,
      avgResponseDays,
      thisMonth,
    };
  }

  async transition(input: TransitionInput): Promise<DataSubjectRequest> {
    // 1. Forged-FK defense — validator-first before any DB read
    await this.entityValidator.validate('DSR', input.dsrId);

    // 2. Validate payload shape (cheap, target-only — independent of current status)
    let validatedPayload: unknown;
    try {
      validatedPayload = DSR_TRANSITION_VALIDATORS[input.target](input.payload);
    } catch (err) {
      if (err instanceof DsrTransitionPayloadError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // 3–9. All side effects in one atomic transaction. Read current status under
    // a per-DSR advisory lock so two concurrent transitions on the same DSR
    // serialize and the second one re-validates against the post-commit state.
    return this.prisma.$transaction(async tx => {
      await acquireXactLock(tx, 'dsr.transition', input.dsrId);

      const dsr = await tx.dataSubjectRequest.findUniqueOrThrow({
        where: { id: input.dsrId },
        select: { id: true, status: true },
      });

      if (!validateTransition(dsr.status, input.target)) {
        throw new BadRequestException(`Invalid transition: ${dsr.status} → ${input.target}`);
      }

      // 5. Target-specific side effects (pause open/close)
      if (input.target === 'AWAITING_REQUESTER') {
        const p = validatedPayload as ValidatedAwaitingRequesterPayload;
        await this.dsrPauseService.open(
          {
            dsrId: input.dsrId,
            reason: p.reason,
            reasonDetails: p.reasonDetails,
            startedBy: input.performedBy,
          },
          tx,
        );
      } else if (
        (input.target === 'ACKNOWLEDGED' || input.target === 'IDENTITY_VERIFIED') &&
        dsr.status === 'AWAITING_REQUESTER'
      ) {
        // Resuming from pause — close the open interval
        await this.dsrPauseService.close(
          {
            dsrId: input.dsrId,
            closedBy: input.performedBy,
          },
          tx,
        );
      }

      // 6. Update DSR row with new status + target-specific direct fields
      const data: Prisma.DataSubjectRequestUpdateInput = { status: input.target };
      if (input.target === 'ACKNOWLEDGED') {
        data.acknowledgedAt = new Date();
      }
      if (input.target === 'IDENTITY_VERIFIED') {
        data.identityVerified = true;
      }
      if (input.target === 'RESPONDED') {
        const p = validatedPayload as ValidatedRespondedPayload;
        data.respondedAt = new Date();
        data.responseNotes = p.responseNotes;
      }
      if (input.target === 'PARTIALLY_FULFILLED') {
        const p = validatedPayload as ValidatedPartiallyFulfilledPayload;
        data.partialFulfilmentNotes = p.partialFulfilmentNotes;
      }
      if (input.target === 'REJECTED') {
        const p = validatedPayload as ValidatedRejectedPayload;
        data.rejectionReason = p.rejectionReason;
        data.rejectionDetails = p.rejectionDetails;
      }
      if (input.target === 'WITHDRAWN') {
        const p = validatedPayload as ValidatedWithdrawnPayload;
        data.withdrawnAt = new Date();
        data.withdrawnReason = p.withdrawnReason ?? null;
      }
      if (input.target === 'CLOSED') {
        data.closedAt = new Date();
      }

      const updated = await tx.dataSubjectRequest.update({
        where: { id: input.dsrId },
        data,
      });

      // 7. Record FollowUpDecision for regulatory-weight transitions
      const decisionKind = mapTransitionToDecisionKind(input.target);
      if (decisionKind) {
        await this.decisions.record(
          {
            entityType: 'DSR',
            entityId: input.dsrId,
            kind: decisionKind,
            outcome: {
              from: dsr.status,
              to: input.target,
              ...(validatedPayload as object),
            },
            rationale: extractRationale(input.target, validatedPayload),
            inputsSnapshot: { previousStatus: dsr.status },
            decidedBy: input.performedBy,
          },
          tx,
        );
      }

      // 8. Emit STATUS_CHANGE Timeline event
      await tx.followUpTimeline.create({
        data: {
          entityType: 'DSR',
          entityId: input.dsrId,
          kind: 'STATUS_CHANGE',
          payload: { from: dsr.status, to: input.target } as Prisma.InputJsonValue,
          performedBy: input.performedBy,
        },
      });

      // 9. Return updated DSR row
      return updated;
    });
  }
}
