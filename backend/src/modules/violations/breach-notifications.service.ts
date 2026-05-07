import { BadRequestException, Injectable } from '@nestjs/common';
import {
  NotificationFilingChannel,
  NotificationFilingPhase,
  PersonsNotificationMethod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityValidator } from '../follow-up/entity-validator';
import { TimelineService } from '../follow-up/timeline.service';

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

export interface FileCnilInput {
  violationId: string;
  phase: NotificationFilingPhase;
  filedAt: Date;
  referenceNumber?: string;
  channel: NotificationFilingChannel;
  delayJustification?: string;
  filedBy: string;
}

export interface NotifyPersonsInput {
  violationId: string;
  method: PersonsNotificationMethod;
  notifiedAt: Date;
  recipientScope: string;
  sentBy: string;
}

type TxClient = Prisma.TransactionClient;

@Injectable()
export class BreachNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidator: EntityValidator,
    private readonly timeline: TimelineService,
  ) {}

  async fileCnil(input: FileCnilInput, tx?: TxClient) {
    await this.entityValidator.validate('VIOLATION', input.violationId);

    // INITIAL filing > 72h after awareness requires delayJustification.
    // COMPLEMENTARY filings are exempt.
    if (input.phase === 'INITIAL') {
      const violation = await (tx ?? this.prisma).violation.findUniqueOrThrow({
        where: { id: input.violationId },
        select: { awarenessAt: true },
      });
      if (violation.awarenessAt) {
        const elapsedMs = input.filedAt.getTime() - violation.awarenessAt.getTime();
        if (elapsedMs > SEVENTY_TWO_HOURS_MS) {
          if (!input.delayJustification || input.delayJustification.trim().length === 0) {
            throw new BadRequestException(
              'INITIAL CNIL filing more than 72 hours after awarenessAt requires delayJustification',
            );
          }
        }
      }
    }

    const writer = async (client: TxClient) => {
      const filing = await client.breachNotificationFiling.create({
        data: {
          violationId: input.violationId,
          phase: input.phase,
          filedAt: input.filedAt,
          referenceNumber: input.referenceNumber,
          channel: input.channel,
          filedBy: input.filedBy,
        },
      });

      // Auto-record a RegulatorInteraction { direction: OUTBOUND, kind: FILING_<phase> }.
      await client.regulatorInteraction.create({
        data: {
          violationId: input.violationId,
          direction: 'OUTBOUND',
          kind: input.phase === 'INITIAL' ? 'FILING_INITIAL' : 'FILING_COMPLEMENTARY',
          occurredAt: input.filedAt,
          referenceNumber: input.referenceNumber,
          summary: `${input.phase} CNIL filing via ${input.channel}`,
          recordedBy: input.filedBy,
        },
      });

      // Emit Timeline NOTIFICATION_SENT event.
      await client.followUpTimeline.create({
        data: {
          entityType: 'VIOLATION',
          entityId: input.violationId,
          kind: 'NOTIFICATION_SENT',
          payload: {
            filingId: filing.id,
            phase: filing.phase,
            channel: filing.channel,
            referenceNumber: filing.referenceNumber,
          } as Prisma.InputJsonValue,
          performedBy: input.filedBy,
        },
      });

      return filing;
    };

    if (tx) {
      return writer(tx);
    }
    return this.prisma.$transaction(writer);
  }

  async notifyPersons(input: NotifyPersonsInput, tx?: TxClient) {
    await this.entityValidator.validate('VIOLATION', input.violationId);

    const writer = async (client: TxClient) => {
      const notification = await client.personsNotification.create({
        data: {
          violationId: input.violationId,
          method: input.method,
          notifiedAt: input.notifiedAt,
          recipientScope: input.recipientScope,
          sentBy: input.sentBy,
        },
      });

      await client.followUpTimeline.create({
        data: {
          entityType: 'VIOLATION',
          entityId: input.violationId,
          kind: 'NOTIFICATION_SENT',
          payload: {
            personsNotificationId: notification.id,
            method: notification.method,
            recipientScope: notification.recipientScope,
          } as Prisma.InputJsonValue,
          performedBy: input.sentBy,
        },
      });

      return notification;
    };

    if (tx) {
      return writer(tx);
    }
    return this.prisma.$transaction(writer);
  }

  async listFilings(violationId: string) {
    await this.entityValidator.validate('VIOLATION', violationId);
    return this.prisma.breachNotificationFiling.findMany({
      where: { violationId },
      orderBy: [{ filedAt: 'asc' }, { id: 'asc' }],
    });
  }

  async listPersonsNotifications(violationId: string) {
    await this.entityValidator.validate('VIOLATION', violationId);
    return this.prisma.personsNotification.findMany({
      where: { violationId },
      orderBy: [{ notifiedAt: 'asc' }, { id: 'asc' }],
    });
  }
}
