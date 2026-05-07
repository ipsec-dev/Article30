import { Injectable } from '@nestjs/common';
import { DecisionKind, EntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityValidator } from './entity-validator';
import { TimelineService } from './timeline.service';

export interface RecordDecisionInput {
  entityType: EntityType;
  entityId: string;
  kind: DecisionKind;
  outcome: Prisma.InputJsonValue;
  rationale: string;
  inputsSnapshot: Prisma.InputJsonValue;
  decidedBy: string;
}

@Injectable()
export class DecisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidator: EntityValidator,
    private readonly timeline: TimelineService,
  ) {}

  async record(input: RecordDecisionInput, tx?: Prisma.TransactionClient) {
    await this.entityValidator.validate(input.entityType, input.entityId);

    const writer = async (client: Prisma.TransactionClient) => {
      // Find the latest non-superseded decision of the same kind for this entity.
      const previous = await client.followUpDecision.findFirst({
        where: {
          entityType: input.entityType,
          entityId: input.entityId,
          kind: input.kind,
          supersededByDecisionId: null,
        },
        orderBy: [{ decidedAt: 'desc' }, { id: 'desc' }],
        select: { id: true },
      });

      const decision = await client.followUpDecision.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          kind: input.kind,
          outcome: input.outcome,
          rationale: input.rationale,
          inputsSnapshot: input.inputsSnapshot,
          decidedBy: input.decidedBy,
        },
      });

      if (previous) {
        await client.followUpDecision.update({
          where: { id: previous.id },
          data: { supersededByDecisionId: decision.id },
        });
      }

      await client.followUpTimeline.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          kind: 'DECISION',
          payload: {
            decisionId: decision.id,
            decisionKind: decision.kind,
          } as Prisma.InputJsonValue,
          performedBy: input.decidedBy,
        },
      });

      return decision;
    };

    if (tx) return writer(tx);
    return this.prisma.$transaction(writer);
  }

  async list(entityType: EntityType, entityId: string) {
    await this.entityValidator.validate(entityType, entityId);
    return this.prisma.followUpDecision.findMany({
      where: { entityType, entityId },
      orderBy: [{ decidedAt: 'asc' }, { id: 'asc' }],
    });
  }
}
