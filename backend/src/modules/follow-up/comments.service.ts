import { Injectable } from '@nestjs/common';
import { CommentVisibility, EntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityValidator } from './entity-validator';
import { TimelineService } from './timeline.service';

export interface CreateCommentInput {
  entityType: EntityType;
  entityId: string;
  authorId: string;
  body: string;
  visibility: CommentVisibility;
}

export interface ListCommentsOptions {
  /** ALL = no visibility filter; AUDITOR_VISIBLE = only AUDITOR_VISIBLE rows. */
  visibility: 'ALL' | 'AUDITOR_VISIBLE';
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidator: EntityValidator,
    private readonly timeline: TimelineService,
  ) {}

  async create(input: CreateCommentInput) {
    // Validate once before opening the transaction. tx-internal validation is
    // unnecessary because the entity row's existence is durable across the
    // transaction window, and double-validation would mean two extra round-trips.
    await this.entityValidator.validate(input.entityType, input.entityId);

    return this.prisma.$transaction(async tx => {
      const comment = await tx.followUpComment.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          authorId: input.authorId,
          body: input.body,
          visibility: input.visibility,
        },
      });
      await tx.followUpTimeline.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          kind: 'COMMENT',
          payload: {
            commentId: comment.id,
            visibility: comment.visibility,
          } as Prisma.InputJsonValue,
          performedBy: input.authorId,
        },
      });
      return comment;
    });
  }

  async list(entityType: EntityType, entityId: string, options: ListCommentsOptions) {
    await this.entityValidator.validate(entityType, entityId);
    const where: Prisma.FollowUpCommentWhereInput = { entityType, entityId };
    if (options.visibility === 'AUDITOR_VISIBLE') {
      where.visibility = 'AUDITOR_VISIBLE';
    }
    return this.prisma.followUpComment.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
}
