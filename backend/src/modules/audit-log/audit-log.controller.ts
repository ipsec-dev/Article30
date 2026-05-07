import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AUDIT_ROLES } from '@article30/shared';
import { AuditLogService } from './audit-log.service';
import { Roles } from '../../common/decorators/roles.decorator';

const AUDIT_READ_RATE_LIMIT = 20;
const AUDIT_READ_RATE_TTL_MS = 60_000;
const DEFAULT_PAGE_SIZE = 20;

@ApiTags('audit-log')
@Controller('audit-log')
@Roles(...AUDIT_ROLES)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('verify')
  verify() {
    return this.auditLogService.verify();
  }

  @Get()
  @Throttle({ default: { limit: AUDIT_READ_RATE_LIMIT, ttl: AUDIT_READ_RATE_TTL_MS } })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entity') entity?: string,
  ) {
    let pageNum = 1;
    if (page) {
      pageNum = Number.parseInt(page, 10);
    }
    let limitNum = DEFAULT_PAGE_SIZE;
    if (limit) {
      limitNum = Number.parseInt(limit, 10);
    }
    return this.auditLogService.findAll(pageNum, limitNum, entity);
  }
}
