import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  DSR_ROLES,
  DELETE_ROLES,
  AUDIT_ROLES,
  FOLLOW_UP_READ_ROLES,
  DsrStatus,
} from '@article30/shared';
import { DsrService } from './dsr.service';
import { DsrPauseService } from './dsr-pause.service';
import { DsrTreatmentProcessingService } from './dsr-treatment-processing.service';
import { RequesterCommunicationsService } from './requester-communications.service';
import { CreateDsrDto } from './dto/create-dsr.dto';
import { UpdateDsrDto } from './dto/update-dsr.dto';
import { SubmitDsrDto } from './dto/submit-dsr.dto';
import { TransitionDsrDto } from './dto/transition.dto';
import { OpenPauseDto } from './dto/pause.dto';
import { UpsertTreatmentProcessingDto } from './dto/treatment-processing.dto';
import { RecordCommunicationDto } from './dto/requester-communication.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequestUser } from '../../common/types/request-user';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const SUBMIT_RATE_LIMIT = 3;
const SUBMIT_RATE_TTL_MS = 60_000;

@ApiTags('dsr')
@Controller('dsr')
export class DsrController {
  constructor(
    private readonly dsrService: DsrService,
    private readonly dsrPauseService: DsrPauseService,
    private readonly dsrTreatmentProcessingService: DsrTreatmentProcessingService,
    private readonly requesterCommunicationsService: RequesterCommunicationsService,
  ) {}

  @Get()
  @Roles(...DSR_ROLES)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: DsrStatus,
    @Query('type') type?: string,
    @Query('overdue') overdue?: string,
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
    return this.dsrService.findAll(parsedPage, parsedLimit, {
      status,
      type,
      overdue: overdue === 'true',
    });
  }

  @Get('stats')
  @Roles(...AUDIT_ROLES)
  getStats() {
    return this.dsrService.getStats();
  }

  @Get(':id')
  @Roles(...DSR_ROLES)
  findOne(@Param('id') id: string) {
    return this.dsrService.findOne(id);
  }

  @Post()
  @Roles(...DSR_ROLES)
  create(@Body() dto: CreateDsrDto, @CurrentUser() user: RequestUser) {
    return this.dsrService.create(dto, user.id);
  }

  @Throttle({ default: { limit: SUBMIT_RATE_LIMIT, ttl: SUBMIT_RATE_TTL_MS } })
  @Public()
  @Post('submit')
  submit(@Body() dto: SubmitDsrDto) {
    return this.dsrService.submit(dto);
  }

  @Patch(':id')
  @Roles(...DSR_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateDsrDto) {
    return this.dsrService.update(id, dto);
  }

  // Workflow transition
  @Patch(':id/transition')
  @Roles(...DSR_ROLES)
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionDsrDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.dsrService.transition({
      dsrId: id,
      target: dto.target,
      payload: dto.payload,
      performedBy: user.id,
    });
  }

  // Pause sub-resource
  @Post(':id/pauses')
  @Roles(...DSR_ROLES)
  openPause(@Param('id') id: string, @Body() dto: OpenPauseDto, @CurrentUser() user: RequestUser) {
    return this.dsrPauseService.open({
      dsrId: id,
      reason: dto.reason,
      reasonDetails: dto.reasonDetails,
      startedBy: user.id,
    });
  }

  @Patch(':id/pauses/active/resume')
  @Roles(...DSR_ROLES)
  closePause(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.dsrPauseService.close({
      dsrId: id,
      closedBy: user.id,
    });
  }

  @Get(':id/pauses')
  @Roles(...FOLLOW_UP_READ_ROLES)
  listPauses(@Param('id') id: string) {
    return this.dsrPauseService.list(id);
  }

  // Treatment processing sub-resource
  @Patch(':id/treatments/:treatmentId/processing')
  @Roles(...DSR_ROLES)
  upsertProcessing(
    @Param('id') id: string,
    @Param('treatmentId') treatmentId: string,
    @Body() dto: UpsertTreatmentProcessingDto,
  ) {
    return this.dsrTreatmentProcessingService.upsert({
      dsrId: id,
      treatmentId,
      searchedAt: dto.searchedAt,
      findingsSummary: dto.findingsSummary,
      actionTaken: dto.actionTaken,
      actionTakenAt: dto.actionTakenAt,
      performedBy: dto.performedBy,
      vendorPropagationStatus: dto.vendorPropagationStatus,
    });
  }

  @Post(':id/treatments/:treatmentId/link')
  @Roles(...DSR_ROLES)
  linkTreatmentProcessing(@Param('id') id: string, @Param('treatmentId') treatmentId: string) {
    return this.dsrTreatmentProcessingService.link(id, treatmentId);
  }

  @Get(':id/treatments/processing')
  @Roles(...FOLLOW_UP_READ_ROLES)
  listProcessing(@Param('id') id: string) {
    return this.dsrTreatmentProcessingService.list(id);
  }

  // Requester communications sub-resource
  @Post(':id/communications')
  @Roles(...DSR_ROLES)
  recordCommunication(
    @Param('id') id: string,
    @Body() dto: RecordCommunicationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.requesterCommunicationsService.record({
      dsrId: id,
      kind: dto.kind,
      sentAt: dto.sentAt,
      channel: dto.channel,
      contentRevisionId: dto.contentRevisionId,
      sentBy: user.id,
    });
  }

  @Get(':id/communications')
  @Roles(...FOLLOW_UP_READ_ROLES)
  listCommunications(@Param('id') id: string) {
    return this.requesterCommunicationsService.list(id);
  }

  @Delete(':id')
  @Roles(...DELETE_ROLES)
  delete(@Param('id') id: string) {
    return this.dsrService.delete(id);
  }
}
