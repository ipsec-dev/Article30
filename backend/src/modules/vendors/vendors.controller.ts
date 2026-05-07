import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { WRITE_ROLES, DELETE_ROLES, VALIDATE_ROLES } from '@article30/shared';
import { VendorsService } from './vendors.service';
import { VendorAssessmentsService } from './vendor-assessments.service';
import { VendorQuestionnairePdfService } from './vendor-questionnaire-pdf.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

interface AssessmentAnswerInput {
  questionId: string;
  answer: string;
  notes?: string;
}

interface ReviewInput {
  status: 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
}

@ApiTags('vendors')
@Controller('vendors')
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly vendorAssessmentsService: VendorAssessmentsService,
    private readonly questionnairePdfService: VendorQuestionnairePdfService,
  ) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
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
    return this.vendorsService.findAll(parsedPage, parsedLimit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Body() dto: CreateVendorDto, @CurrentUser() user: RequestUser) {
    return this.vendorsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...DELETE_ROLES)
  delete(@Param('id') id: string) {
    return this.vendorsService.delete(id);
  }

  @Get(':vendorId/assessment')
  findAssessment(@Param('vendorId') vendorId: string) {
    return this.vendorAssessmentsService.findByVendor(vendorId);
  }

  @Get(':id/questionnaire')
  async questionnaire(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.questionnairePdfService.generate(id, user.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="vendor-questionnaire-${id}.pdf"`,
      // Override the global helmet `frame-ancestors 'none'` for this route
      // only — required for the in-app PDF preview iframe.
      'Content-Security-Policy': "frame-ancestors 'self'",
    });
    res.send(buffer);
  }

  @Post(':vendorId/assessment')
  @Roles(...WRITE_ROLES)
  createAssessment(@Param('vendorId') vendorId: string, @CurrentUser() user: RequestUser) {
    return this.vendorAssessmentsService.create(vendorId, user.id);
  }

  @Patch(':vendorId/assessment/:assessmentId')
  @Roles(...WRITE_ROLES)
  updateAssessment(
    @Param('assessmentId') assessmentId: string,
    @Body() body: { answers: AssessmentAnswerInput[] },
  ) {
    return this.vendorAssessmentsService.update(
      assessmentId,
      body.answers as unknown as Parameters<VendorAssessmentsService['update']>[1],
    );
  }

  @Patch(':vendorId/assessment/:assessmentId/submit')
  @Roles(...WRITE_ROLES)
  submitAssessment(@Param('assessmentId') assessmentId: string) {
    return this.vendorAssessmentsService.submit(assessmentId);
  }

  @Patch(':vendorId/assessment/:assessmentId/review')
  @Roles(...VALIDATE_ROLES)
  reviewAssessment(
    @Param('assessmentId') assessmentId: string,
    @Body() body: ReviewInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.vendorAssessmentsService.review(
      assessmentId,
      body.status,
      body.reviewNotes,
      user.id,
    );
  }
}
