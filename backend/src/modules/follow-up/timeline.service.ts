import { Injectable } from '@nestjs/common';
import { EntityType, Prisma, TimelineEventKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityValidator } from './entity-validator';

export interface RecordTimelineInput {
  entityType: EntityType;
  entityId: string;
  kind: TimelineEventKind;
  payload: Prisma.InputJsonValue;
  performedBy: string | null;
}

@Injectable()
export class TimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidator: EntityValidator,
  ) {}

  async record(input: RecordTimelineInput) {
    await this.entityValidator.validate(input.entityType, input.entityId);
    return this.prisma.followUpTimeline.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        kind: input.kind,
        payload: input.payload,
        performedBy: input.performedBy ?? undefined,
      },
    });
  }

  async list(entityType: EntityType, entityId: string) {
    await this.entityValidator.validate(entityType, entityId);
    return this.prisma.followUpTimeline.findMany({
      where: { entityType, entityId },
      orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
    });
  }
}
