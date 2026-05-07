import { Injectable } from '@nestjs/common';
import { Prisma, RegulatorInteractionDirection, RegulatorInteractionKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityValidator } from '../follow-up/entity-validator';
import { TimelineService } from '../follow-up/timeline.service';

export interface RecordInteractionInput {
  violationId: string;
  direction: RegulatorInteractionDirection;
  kind: RegulatorInteractionKind;
  occurredAt: Date;
  referenceNumber?: string;
  summary: string;
  recordedBy: string;
}

type TxClient = Prisma.TransactionClient;

@Injectable()
export class RegulatorInteractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidator: EntityValidator,
    private readonly timeline: TimelineService,
  ) {}

  async record(input: RecordInteractionInput, tx?: TxClient) {
    await this.entityValidator.validate('VIOLATION', input.violationId);

    const writer = async (client: TxClient) => {
      const interaction = await client.regulatorInteraction.create({
        data: {
          violationId: input.violationId,
          direction: input.direction,
          kind: input.kind,
          occurredAt: input.occurredAt,
          referenceNumber: input.referenceNumber,
          summary: input.summary,
          recordedBy: input.recordedBy,
        },
      });

      await client.followUpTimeline.create({
        data: {
          entityType: 'VIOLATION',
          entityId: input.violationId,
          kind: 'INTERACTION_LOGGED',
          payload: {
            interactionId: interaction.id,
            direction: interaction.direction,
            kind: interaction.kind,
            summary: interaction.summary,
          } as Prisma.InputJsonValue,
          performedBy: input.recordedBy,
        },
      });

      return interaction;
    };

    if (tx) return writer(tx);
    return this.prisma.$transaction(writer);
  }

  async list(violationId: string) {
    await this.entityValidator.validate('VIOLATION', violationId);
    return this.prisma.regulatorInteraction.findMany({
      where: { violationId },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
  }
}
