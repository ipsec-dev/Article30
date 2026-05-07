import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DecisionKind,
  Prisma,
  Violation,
  ViolationStatus as PrismaViolationStatus,
} from '@prisma/client';
import { Role } from '@article30/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PRISMA_SELECT } from '../../common/prisma/select-shapes';
import { CreateViolationDto } from './dto/create-violation.dto';
import { UpdateViolationDto } from './dto/update-violation.dto';
import { RequestUser } from '../../common/types/request-user';
import {
  isProcessOwner,
  ownsTreatment,
  treatmentOwnershipWhere,
} from '../../common/authorization/treatment-ownership';
import { EntityValidator } from '../follow-up/entity-validator';
import { DecisionsService } from '../follow-up/decisions.service';
import { NotificationService } from '../notifications/notification.service';
import { loadNotificationContext } from '../notifications/notification-context';
import {
  formatSeverity,
  formatDateLocale,
  formatDateTimeLocale,
  shortRef,
  MS_PER_HOUR,
} from '../notifications/format';
import { resolveRecipientLocale } from '../notifications/locale-resolver';
import { BreachNotificationsService } from './breach-notifications.service';
import { validateTransition } from './state-machine';
import {
  TRANSITION_VALIDATORS,
  TransitionPayloadError,
  ValidatedDismissPayload,
  ValidatedFileCnilPayload,
  ValidatedPersonsNotifiedPayload,
  ValidatedWaiverPayload,
  ValidatedClosedPayload,
} from './transition-validators';

export interface TransitionInput {
  violationId: string;
  target: PrismaViolationStatus;
  payload: unknown;
  performedBy: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const TREATMENT_INCLUDE = {
  treatments: {
    include: { treatment: { select: PRISMA_SELECT.treatmentRef } },
  },
} as const;

@Injectable()
export class ViolationsService {
  private readonly logger = new Logger(ViolationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidator: EntityValidator,
    private readonly decisions: DecisionsService,
    private readonly breachNotifications: BreachNotificationsService,
    private readonly notifications: NotificationService,
  ) {}

  async findAll(page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, user?: RequestUser) {
    let where: Prisma.ViolationWhereInput = {};
    if (isProcessOwner(user) && user) {
      where = { treatments: { some: { treatment: treatmentOwnershipWhere(user.id) } } };
    }

    const [data, total] = await Promise.all([
      this.prisma.violation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: PRISMA_SELECT.userRef },
          ...TREATMENT_INCLUDE,
        },
      }),
      this.prisma.violation.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string, user?: RequestUser) {
    const violation = await this.prisma.violation.findUnique({
      where: { id },
      include: {
        creator: { select: PRISMA_SELECT.userRef },
        treatments: {
          include: {
            treatment: { select: { id: true, name: true, createdBy: true, assignedTo: true } },
          },
        },
      },
    });
    if (!violation) {
      throw new NotFoundException('Violation not found');
    }

    if (isProcessOwner(user) && user) {
      const hasOwnedTreatment = violation.treatments.some(vt =>
        ownsTreatment(vt.treatment, user.id),
      );
      if (!hasOwnedTreatment) {
        throw new ForbiddenException('You do not have access to this violation');
      }
    }

    return violation;
  }

  async create(dto: CreateViolationDto, userId: string, userRole?: string) {
    // Destructure and discard legacy fields that no longer exist in the schema.
    const {
      treatmentIds,
      discoveredAt,
      notifiedToCnil: _notifiedToCnil,
      notifiedToPersons: _notifiedToPersons,
      riskLevel: _riskLevel,
      ...rest
    } = dto;

    if (userRole === Role.PROCESS_OWNER && treatmentIds?.length) {
      const ownedCount = await this.prisma.treatment.count({
        where: {
          id: { in: treatmentIds },
          ...treatmentOwnershipWhere(userId),
        },
      });
      if (ownedCount !== treatmentIds.length) {
        throw new ForbiddenException('You can only link violations to your own treatments');
      }
    }

    const treatmentsField: { treatments?: { create: { treatmentId: string }[] } } = {};
    if (treatmentIds?.length) {
      treatmentsField.treatments = { create: treatmentIds.map(treatmentId => ({ treatmentId })) };
    }

    const violation = await this.prisma.violation.create({
      data: {
        ...rest,
        ...treatmentsField,
        awarenessAt: new Date(discoveredAt),
        createdBy: userId,
      },
      include: TREATMENT_INCLUDE,
    });
    this.logger.log({
      event: 'violation.created',
      violationId: violation.id,
      severity: dto.severity,
      userId,
    });

    await this.emitViolationCreatedNotifications(violation);

    return violation;
  }

  private async emitViolationCreatedNotifications(v: Violation): Promise<void> {
    // Instant-notification side-effects must never fail the user-facing
    // operation: the violation row is already persisted when we get here.
    try {
      const { org, assignee } = await loadNotificationContext(this.prisma, v.assignedTo);
      const locale = resolveRecipientLocale(org?.locale ?? null);
      const sevLabel = formatSeverity(v.severity, locale);
      const ref = shortRef('VIO', v.id);
      const recordUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/violations/${v.id}`;
      const recipient = {
        assigneeEmail: assignee?.email ?? null,
        orgDpoEmail: org?.dpoEmail ?? null,
        orgLocale: org?.locale ?? 'fr',
        orgCompanyName: org?.companyName ?? '',
        recipientRole: (assignee ? 'assignee' : 'dpo') as 'assignee' | 'dpo',
      };
      // Categories fall back to a placeholder so the template doesn't render an
      // empty `Catégories` row with trailing whitespace.
      const categoriesLabel =
        v.dataCategories.length > 0
          ? v.dataCategories.join(', ')
          : locale === 'fr'
            ? 'Aucune'
            : 'None';
      const baseCtx = {
        recipientFirstName: assignee?.firstName ?? org?.dpoName ?? '',
        severityLabel: sevLabel,
        discoveredDate: formatDateLocale(v.awarenessAt, locale),
        categoriesLabel,
        shortRef: ref,
        recordUrl,
      };

      await this.notifications.notify({
        kind: 'violation.logged',
        recordId: v.id,
        ...recipient,
        context: baseCtx,
      });

      if (v.severity === 'HIGH' || v.severity === 'CRITICAL') {
        const cnilDeadline = new Date(v.awarenessAt.getTime() + 72 * MS_PER_HOUR);
        const remainingMs = cnilDeadline.getTime() - Date.now();
        const remainingHours = Math.max(0, Math.round(remainingMs / MS_PER_HOUR));
        await this.notifications.notify({
          kind: 'violation.high-severity-72h-kickoff',
          recordId: v.id,
          ...recipient,
          context: {
            recipientFirstName: baseCtx.recipientFirstName,
            severityLabel: sevLabel,
            awarenessDate: formatDateLocale(v.awarenessAt, locale),
            cnilDeadlineDate: formatDateTimeLocale(cnilDeadline, locale),
            leadTimeLabel: locale === 'fr' ? `${remainingHours} h` : `${remainingHours} hours`,
            shortRef: ref,
            recordUrl,
          },
        });
      }
    } catch (err) {
      this.logger.error({
        event: 'notification.failed',
        kind: 'violation.logged',
        recordId: v.id,
        err,
      });
    }
  }

  async update(id: string, dto: UpdateViolationDto) {
    await this.findOne(id);
    const {
      treatmentIds,
      discoveredAt,
      notifiedToCnil: _notifiedToCnil,
      notifiedToPersons: _notifiedToPersons,
      riskLevel: _riskLevel,
      ...rest
    } = dto;

    const data: Prisma.ViolationUpdateInput = { ...rest };
    if (discoveredAt) {
      data.awarenessAt = new Date(discoveredAt);
    }

    if (treatmentIds !== undefined) {
      await this.prisma.violationTreatment.deleteMany({ where: { violationId: id } });
      if (treatmentIds.length > 0) {
        await this.prisma.violationTreatment.createMany({
          data: treatmentIds.map(treatmentId => ({ violationId: id, treatmentId })),
        });
      }
    }

    this.logger.debug({ event: 'violation.updated', violationId: id });
    return this.prisma.violation.update({
      data,
      where: { id },
      include: TREATMENT_INCLUDE,
    });
  }

  async transition(input: TransitionInput) {
    // 1. Entity exists
    await this.entityValidator.validate('VIOLATION', input.violationId);

    // 2. Fetch current state
    const violation = await this.prisma.violation.findUniqueOrThrow({
      where: { id: input.violationId },
      select: { id: true, status: true, awarenessAt: true },
    });

    // 3. Validate edge
    if (!validateTransition(violation.status, input.target)) {
      throw new BadRequestException(`Invalid transition: ${violation.status} → ${input.target}`);
    }

    // 4. Validate payload shape
    let validatedPayload: unknown;
    try {
      validatedPayload = TRANSITION_VALIDATORS[input.target](input.payload);
    } catch (err) {
      if (err instanceof TransitionPayloadError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // 5. Compose side effects in one transaction
    return this.prisma.$transaction(async tx => {
      // 5a. Domain side effect (target-specific)
      if (input.target === 'NOTIFIED_CNIL') {
        const p = validatedPayload as ValidatedFileCnilPayload;
        await this.breachNotifications.fileCnil(
          {
            violationId: input.violationId,
            phase: p.phase,
            filedAt: new Date(),
            referenceNumber: p.referenceNumber,
            channel: p.channel,
            delayJustification: p.delayJustification,
            filedBy: input.performedBy,
          },
          tx,
        );
      } else if (input.target === 'PERSONS_NOTIFIED') {
        const p = validatedPayload as ValidatedPersonsNotifiedPayload;
        await this.breachNotifications.notifyPersons(
          {
            violationId: input.violationId,
            method: p.method,
            notifiedAt: new Date(),
            recipientScope: p.recipientScope,
            sentBy: input.performedBy,
          },
          tx,
        );
      }

      // 5b. Update violation row with status + target-specific direct fields
      const data: Prisma.ViolationUpdateInput = { status: input.target };
      if (input.target === 'DISMISSED') {
        data.dismissalReason = (validatedPayload as ValidatedDismissPayload).dismissalReason;
      }
      if (input.target === 'PERSONS_NOTIFICATION_WAIVED') {
        const p = validatedPayload as ValidatedWaiverPayload;
        data.personsNotificationWaiver = p.ground;
        data.waiverJustification = p.justification;
      }
      if (input.target === 'CLOSED') {
        const p = validatedPayload as ValidatedClosedPayload;
        data.closedAt = new Date();
        if (p.closureReason !== undefined) data.closureReason = p.closureReason;
        if (p.lessonsLearned !== undefined) data.lessonsLearned = p.lessonsLearned;
      }
      const updated = await tx.violation.update({
        where: { id: input.violationId },
        data,
      });

      // 5c. Record Decision (the audit record of the transition)
      const decisionKind = mapTransitionToDecisionKind(input.target);
      if (decisionKind) {
        await this.decisions.record(
          {
            entityType: 'VIOLATION',
            entityId: input.violationId,
            kind: decisionKind,
            outcome: {
              from: violation.status,
              to: input.target,
              ...(validatedPayload as object),
            },
            rationale: extractRationale(input.target, validatedPayload),
            inputsSnapshot: {
              previousStatus: violation.status,
              awarenessAt: violation.awarenessAt,
            },
            decidedBy: input.performedBy,
          },
          tx,
        );
      }

      // 5d. Emit Timeline STATUS_CHANGE event
      await tx.followUpTimeline.create({
        data: {
          entityType: 'VIOLATION',
          entityId: input.violationId,
          kind: 'STATUS_CHANGE',
          payload: { from: violation.status, to: input.target } as Prisma.InputJsonValue,
          performedBy: input.performedBy,
        },
      });

      return updated;
    });
  }
}

function mapTransitionToDecisionKind(target: PrismaViolationStatus): DecisionKind | null {
  switch (target) {
    case 'DISMISSED':
      return 'DISMISS_BREACH';
    case 'NOTIFIED_CNIL':
      return 'NOTIFY_CNIL';
    case 'PERSONS_NOTIFICATION_WAIVED':
      return 'WAIVE_PERSONS_NOTIFICATION';
    case 'REOPENED':
      return 'REOPEN';
    default:
      return null;
  }
}

function extractRationale(target: PrismaViolationStatus, payload: unknown): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  switch (target) {
    case 'DISMISSED':
      return typeof p.dismissalReason === 'string' ? p.dismissalReason : 'Status transition';
    case 'NOTIFIED_CNIL':
      return typeof p.delayJustification === 'string' && p.delayJustification.length > 0
        ? p.delayJustification
        : 'CNIL notification filed';
    case 'PERSONS_NOTIFICATION_WAIVED':
      return typeof p.justification === 'string' ? p.justification : 'Status transition';
    case 'REOPENED':
      return typeof p.rationale === 'string' ? p.rationale : 'Status transition';
    case 'CLOSED':
      return typeof p.closureReason === 'string' ? p.closureReason : 'Closed';
    default:
      return 'Status transition';
  }
}
