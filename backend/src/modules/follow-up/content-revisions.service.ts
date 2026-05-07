import { Injectable } from '@nestjs/common';
import { ContentRevisionField, EntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityValidator } from './entity-validator';

export interface SaveRevisionInput {
  entityType: EntityType;
  entityId: string;
  field: ContentRevisionField;
  content: string;
  authorId: string;
}

@Injectable()
export class ContentRevisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidator: EntityValidator,
  ) {}

  async save(input: SaveRevisionInput) {
    await this.entityValidator.validate(input.entityType, input.entityId);

    return this.prisma.$transaction(async tx => {
      const last = await tx.followUpContentRevision.findFirst({
        where: {
          entityType: input.entityType,
          entityId: input.entityId,
          field: input.field,
        },
        orderBy: [{ version: 'desc' }],
        select: { version: true },
      });
      const nextVersion = (last?.version ?? 0) + 1;
      return tx.followUpContentRevision.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          field: input.field,
          version: nextVersion,
          content: input.content,
          authorId: input.authorId,
        },
      });
    });
  }

  async latest(entityType: EntityType, entityId: string, field: ContentRevisionField) {
    await this.entityValidator.validate(entityType, entityId);
    return this.prisma.followUpContentRevision.findFirst({
      where: { entityType, entityId, field },
      orderBy: [{ version: 'desc' }],
    });
  }

  async history(entityType: EntityType, entityId: string, field: ContentRevisionField) {
    await this.entityValidator.validate(entityType, entityId);
    return this.prisma.followUpContentRevision.findMany({
      where: { entityType, entityId, field },
      orderBy: [{ version: 'asc' }],
    });
  }
}
