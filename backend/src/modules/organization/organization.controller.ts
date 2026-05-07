import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@article30/shared';
import { OrganizationService } from './organization.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { NotificationSettingsDto } from './dto/notification-settings.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';

@ApiTags('organization')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  get() {
    return this.organizationService.get();
  }

  @Patch()
  @Roles(Role.ADMIN)
  update(@Body() dto: UpdateOrganizationDto) {
    return this.organizationService.update(dto);
  }

  @Get('settings')
  @Roles(Role.ADMIN, Role.DPO)
  getSettings() {
    return this.organizationService.getNotificationSettings();
  }

  // SkipAudit: the global AuditLogInterceptor would record this as
  // entity='organization' (extracted from the path's first segment), but
  // settings updates are conceptually distinct from the broader org-profile
  // PATCH. The service writes its own 'organization-settings' audit row so
  // operators can filter the two streams separately.
  @Patch('settings')
  @Roles(Role.ADMIN, Role.DPO)
  @SkipAudit()
  updateSettings(@Body() dto: NotificationSettingsDto, @CurrentUser() user: RequestUser) {
    return this.organizationService.updateNotificationSettings(dto, user.id);
  }
}
