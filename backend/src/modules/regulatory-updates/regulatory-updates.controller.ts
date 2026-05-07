import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ADMIN_ROLES, AUDIT_ROLES, WRITE_ROLES } from '@article30/shared';
import { RegulatoryUpdatesService } from './regulatory-updates.service';
import { SetImpactLevelDto } from './dto/set-impact-level.dto';
import { SetStatusDto } from './dto/set-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@ApiTags('regulatory-updates')
@Controller('regulatory-updates')
export class RegulatoryUpdatesController {
  constructor(private readonly service: RegulatoryUpdatesService) {}

  @Get()
  @Roles(...AUDIT_ROLES)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('source') source?: string,
    @Query('impactLevel') impactLevel?: string,
    @Query('status') status?: string,
    @Query('saved') saved?: string,
  ) {
    let parsedPage: number;
    if (page) {
      parsedPage = Number.parseInt(page, 10);
    } else {
      parsedPage = DEFAULT_PAGE;
    }
    let parsedLimit: number;
    if (limit) {
      parsedLimit = Number.parseInt(limit, 10);
    } else {
      parsedLimit = DEFAULT_LIMIT;
    }
    let savedFilter: boolean | null;
    if (saved === undefined) {
      savedFilter = null;
    } else {
      savedFilter = saved === 'true';
    }
    return this.service.findAll(parsedPage, parsedLimit, {
      source,
      impactLevel,
      status,
      saved: savedFilter,
    });
  }

  @Get('new-count')
  @Roles(...AUDIT_ROLES)
  countNew() {
    return this.service.countNew();
  }

  @Post('sync')
  @Roles(...ADMIN_ROLES)
  sync() {
    return this.service.sync();
  }

  @Patch(':id/impact')
  @Roles(...WRITE_ROLES)
  setImpactLevel(@Param('id') id: string, @Body() dto: SetImpactLevelDto) {
    return this.service.setImpactLevel(id, dto.impactLevel);
  }

  @Patch(':id/status')
  @Roles(...WRITE_ROLES)
  setStatus(@Param('id') id: string, @Body() dto: SetStatusDto) {
    return this.service.setStatus(id, dto.status);
  }

  @Patch(':id/saved')
  @Roles(...WRITE_ROLES)
  toggleSaved(@Param('id') id: string) {
    return this.service.toggleSaved(id);
  }
}
