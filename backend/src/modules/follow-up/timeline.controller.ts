import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EntityType } from '@prisma/client';
import { FOLLOW_UP_READ_ROLES } from '@article30/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { TimelineService } from './timeline.service';

@ApiTags('follow-up')
@Controller('follow-up/timeline')
export class TimelineController {
  constructor(private readonly timeline: TimelineService) {}

  @Get(':entityType/:entityId')
  @Roles(...FOLLOW_UP_READ_ROLES)
  async list(@Param('entityType') entityType: EntityType, @Param('entityId') entityId: string) {
    return this.timeline.list(entityType, entityId);
  }
}
