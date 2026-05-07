import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EntityType } from '@prisma/client';
import { FOLLOW_UP_READ_ROLES, FOLLOW_UP_WRITE_ROLES, Role } from '@article30/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('follow-up')
@Controller('follow-up/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get(':entityType/:entityId')
  @Roles(...FOLLOW_UP_READ_ROLES)
  async list(
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
    @CurrentUser() user: RequestUser,
  ) {
    // Server-side visibility filter: AUDITOR sees only AUDITOR_VISIBLE comments.
    const visibility = user.role === Role.AUDITOR ? 'AUDITOR_VISIBLE' : 'ALL';
    return this.comments.list(entityType, entityId, { visibility });
  }

  @Post()
  @Roles(...FOLLOW_UP_WRITE_ROLES)
  async create(@Body() dto: CreateCommentDto, @CurrentUser() user: RequestUser) {
    return this.comments.create({
      entityType: dto.entityType,
      entityId: dto.entityId,
      authorId: user.id,
      body: dto.body,
      visibility: dto.visibility,
    });
  }
}
