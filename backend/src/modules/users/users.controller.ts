import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@article30/shared';
import { UsersService } from './users.service';
import { ChangeRoleDto } from './dto/change-role.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';

@ApiTags('users')
@Controller('users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.usersService.approve(id);
  }

  @Patch(':id/role')
  changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.changeRole(id, dto.role, user.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.deactivate(id, user.id);
  }

  @Patch(':id/admin-reset-password')
  @SkipAudit()
  @HttpCode(HttpStatus.OK)
  adminResetPassword(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.usersService.adminResetPassword(id, user.id, req.headers['accept-language']);
  }

  @Post()
  @SkipAudit()
  @HttpCode(HttpStatus.CREATED)
  invite(@Body() dto: InviteUserDto, @CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.usersService.invite(dto, user.id, req.headers['accept-language']);
  }
}
