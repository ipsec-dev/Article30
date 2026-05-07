import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, RemediationActionItem, RemediationActionItemStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityValidator } from '../follow-up/entity-validator';
import { TimelineService } from '../follow-up/timeline.service';
import { NotificationService } from '../notifications/notification.service';
import { loadNotificationContext } from '../notifications/notification-context';
import { formatDateLocale, shortRef } from '../notifications/format';
import { resolveRecipientLocale } from '../notifications/locale-resolver';

export interface CreateActionItemInput {
  violationId: string;
  title: string;
  description?: string;
  ownerId: string;
  deadline: Date;
}

export interface UpdateActionItemInput {
  actionItemId: string;
  title?: string;
  description?: string;
  ownerId?: string;
  deadline?: Date;
  status?: RemediationActionItemStatus;
  /** Required when status transitions to DONE — used to set doneBy. */
  updatedBy: string;
}

@Injectable()
export class RemediationService {
  private readonly logger = new Logger(RemediationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidator: EntityValidator,
    private readonly timeline: TimelineService,
    private readonly notifications: NotificationService,
  ) {}

  async create(input: CreateActionItemInput) {
    await this.entityValidator.validate('VIOLATION', input.violationId);

    const item = await this.prisma.$transaction(async tx => {
      const created = await tx.remediationActionItem.create({
        data: {
          violationId: input.violationId,
          title: input.title,
          description: input.description,
          ownerId: input.ownerId,
          deadline: input.deadline,
        },
      });
      await tx.followUpTimeline.create({
        data: {
          entityType: 'VIOLATION',
          entityId: input.violationId,
          kind: 'ASSIGNMENT',
          payload: {
            actionItemId: created.id,
            title: created.title,
            ownerId: created.ownerId,
            deadline: created.deadline.toISOString(),
          } as Prisma.InputJsonValue,
          performedBy: input.ownerId,
        },
      });
      return created;
    });

    await this.emitAssignedNotification(item);

    return item;
  }

  async update(input: UpdateActionItemInput) {
    const target = await this.prisma.remediationActionItem.findUnique({
      where: { id: input.actionItemId },
    });
    if (!target) {
      throw new NotFoundException('Action item not found');
    }

    const data: Prisma.RemediationActionItemUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.ownerId !== undefined) data.owner = { connect: { id: input.ownerId } };
    if (input.deadline !== undefined) data.deadline = input.deadline;

    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'DONE') {
        data.doneAt = new Date();
        data.doer = { connect: { id: input.updatedBy } };
      } else if (target.status === 'DONE') {
        // Reverting from DONE — clear the markers.
        data.doneAt = null;
        data.doer = { disconnect: true };
      }
    }

    const updated = await this.prisma.remediationActionItem.update({
      where: { id: input.actionItemId },
      data,
    });

    if (input.ownerId !== undefined && target.ownerId !== updated.ownerId) {
      // Sentinel includes the new ownerId AND the change timestamp, so an
      // A→B→A→B reassignment cycle always re-notifies — without the timestamp,
      // the second OWNER:B row would collide with the unique constraint and
      // the notification would be silently dropped as a "race_lost" duplicate.
      await this.emitAssignedNotification(
        updated,
        `OWNER:${updated.ownerId}:${new Date().toISOString()}`,
      );
    }

    return updated;
  }

  async list(violationId: string) {
    await this.entityValidator.validate('VIOLATION', violationId);
    return this.prisma.remediationActionItem.findMany({
      where: { violationId },
      orderBy: [{ deadline: 'asc' }, { id: 'asc' }],
    });
  }

  private async emitAssignedNotification(
    item: RemediationActionItem,
    leadTime?: string,
  ): Promise<void> {
    // INSTANT kind by default (no settings gate; see notification-kinds.ts).
    // The optional leadTime sentinel is only used by the owner-change path
    // to bypass the (kind, recordId, leadTime='INSTANT') unique constraint.
    // Notification side-effects must never fail the user-facing operation:
    // the action item is already persisted when we get here.
    try {
      const { org, assignee } = await loadNotificationContext(this.prisma, item.ownerId);
      if (!assignee) return;
      const locale = resolveRecipientLocale(org?.locale ?? null);
      const violation = await this.prisma.violation.findUnique({
        where: { id: item.violationId },
        select: { title: true },
      });
      await this.notifications.notify({
        kind: 'action-item.assigned',
        recordId: item.id,
        leadTime,
        assigneeEmail: assignee.email,
        orgDpoEmail: org?.dpoEmail ?? null,
        orgLocale: org?.locale ?? 'fr',
        orgCompanyName: org?.companyName ?? '',
        recipientRole: 'assignee',
        context: {
          recipientFirstName: assignee.firstName,
          taskTitle: item.title,
          violationTitle: violation?.title ?? '',
          deadlineDate: formatDateLocale(item.deadline, locale),
          shortRef: shortRef('ACT', item.id),
          recordUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/violations/${item.violationId}`,
        },
      });
    } catch (err) {
      this.logger.error({
        event: 'notification.failed',
        kind: 'action-item.assigned',
        recordId: item.id,
        err,
      });
    }
  }
}
