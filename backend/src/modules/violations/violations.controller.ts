import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FOLLOW_UP_READ_ROLES, VALIDATE_ROLES, WRITE_ROLES } from '@article30/shared';
import { ViolationsService } from './violations.service';
import { BreachRiskAssessmentService } from './breach-risk-assessment.service';
import { BreachNotificationsService } from './breach-notifications.service';
import { RegulatorInteractionsService } from './regulator-interactions.service';
import { RemediationService } from './remediation.service';
import { CreateViolationDto } from './dto/create-violation.dto';
import { UpdateViolationDto } from './dto/update-violation.dto';
import { TransitionDto } from './dto/transition.dto';
import { CreateRiskAssessmentDto } from './dto/risk-assessment.dto';
import { RecordInteractionDto } from './dto/regulator-interaction.dto';
import { CreateActionItemDto, UpdateActionItemDto } from './dto/action-item.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@ApiTags('violations')
@Controller('violations')
export class ViolationsController {
  constructor(
    private readonly violationsService: ViolationsService,
    private readonly riskAssessment: BreachRiskAssessmentService,
    private readonly notifications: BreachNotificationsService,
    private readonly regulator: RegulatorInteractionsService,
    private readonly remediation: RemediationService,
  ) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: RequestUser,
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
    return this.violationsService.findAll(parsedPage, parsedLimit, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    return this.violationsService.findOne(id, user);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Body() dto: CreateViolationDto, @CurrentUser() user: RequestUser) {
    return this.violationsService.create(dto, user.id, user.role);
  }

  @Patch(':id/transition')
  @Roles(...WRITE_ROLES)
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.violationsService.transition({
      violationId: id,
      target: dto.target,
      payload: dto.payload,
      performedBy: user.id,
    });
  }

  @Post(':id/risk-assessment')
  @Roles(...WRITE_ROLES)
  createRiskAssessment(
    @Param('id') id: string,
    @Body() dto: CreateRiskAssessmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.riskAssessment.create({
      violationId: id,
      ...dto,
      assessedBy: user.id,
    });
  }

  @Get(':id/risk-assessment')
  @Roles(...FOLLOW_UP_READ_ROLES)
  getCurrentRiskAssessment(@Param('id') id: string) {
    return this.riskAssessment.current(id);
  }

  @Get(':id/risk-assessment/history')
  @Roles(...FOLLOW_UP_READ_ROLES)
  getRiskAssessmentHistory(@Param('id') id: string) {
    return this.riskAssessment.history(id);
  }

  @Get(':id/filings')
  @Roles(...FOLLOW_UP_READ_ROLES)
  listFilings(@Param('id') id: string) {
    return this.notifications.listFilings(id);
  }

  @Get(':id/persons-notifications')
  @Roles(...FOLLOW_UP_READ_ROLES)
  listPersonsNotifications(@Param('id') id: string) {
    return this.notifications.listPersonsNotifications(id);
  }

  @Post(':id/regulator-interactions')
  @Roles(...VALIDATE_ROLES)
  recordInteraction(
    @Param('id') id: string,
    @Body() dto: RecordInteractionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.regulator.record({
      violationId: id,
      direction: dto.direction,
      kind: dto.kind,
      occurredAt: new Date(dto.occurredAt),
      referenceNumber: dto.referenceNumber,
      summary: dto.summary,
      recordedBy: user.id,
    });
  }

  @Get(':id/regulator-interactions')
  @Roles(...FOLLOW_UP_READ_ROLES)
  listInteractions(@Param('id') id: string) {
    return this.regulator.list(id);
  }

  @Post(':id/action-items')
  @Roles(...WRITE_ROLES)
  createActionItem(@Param('id') id: string, @Body() dto: CreateActionItemDto) {
    return this.remediation.create({
      violationId: id,
      title: dto.title,
      description: dto.description,
      ownerId: dto.ownerId,
      deadline: new Date(dto.deadline),
    });
  }

  @Patch(':id/action-items/:actionItemId')
  @Roles(...WRITE_ROLES)
  updateActionItem(
    @Param('id') _violationId: string,
    @Param('actionItemId') actionItemId: string,
    @Body() dto: UpdateActionItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.remediation.update({
      actionItemId,
      title: dto.title,
      description: dto.description,
      ownerId: dto.ownerId,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      status: dto.status,
      updatedBy: user.id,
    });
  }

  @Get(':id/action-items')
  @Roles(...FOLLOW_UP_READ_ROLES)
  listActionItems(@Param('id') id: string) {
    return this.remediation.list(id);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateViolationDto) {
    return this.violationsService.update(id, dto);
  }
}
