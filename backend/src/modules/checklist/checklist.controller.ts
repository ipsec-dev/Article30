import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WRITE_ROLES } from '@article30/shared';
import { ChecklistService } from './checklist.service';
import { UpsertResponseDto } from './dto/upsert-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';

@ApiTags('checklist')
@Controller('checklist')
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Get('responses')
  findAll() {
    return this.checklistService.findAll();
  }

  @Put(':itemId')
  @Roles(...WRITE_ROLES)
  upsert(
    @Param('itemId') itemId: string,
    @Body() dto: UpsertResponseDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.checklistService.upsert(itemId, dto, user.id);
  }
}
