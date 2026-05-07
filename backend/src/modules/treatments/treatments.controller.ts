import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { resolvePdfLocale } from '../../common/pdf/pdf-locale';
import {
  Role,
  DELETE_ROLES,
  VALIDATE_ROLES,
  EXPORT_ROLES,
  TREATMENT_WRITE_ROLES,
  TREATMENT_IMPORT_LIMITS,
  TREATMENT_IMPORT_TEMPLATE_FILENAME,
} from '@article30/shared';
import { TreatmentsService } from './treatments.service';
import { TreatmentsImportService } from './treatments-import.service';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@ApiTags('treatments')
@Controller('treatments')
export class TreatmentsController {
  constructor(
    private readonly treatmentsService: TreatmentsService,
    private readonly importService: TreatmentsImportService,
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
    return this.treatmentsService.findAll(parsedPage, parsedLimit, user);
  }

  @Get('import-template')
  @Roles(...TREATMENT_WRITE_ROLES)
  @SkipAudit()
  async importTemplate(@Res() res: Response) {
    const buffer = this.importService.generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${TREATMENT_IMPORT_TEMPLATE_FILENAME}"`,
    });
    res.send(buffer);
  }

  @Post('import')
  @Roles(...TREATMENT_WRITE_ROLES)
  @SkipAudit()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: TREATMENT_IMPORT_LIMITS.maxBytes },
    }),
  )
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('file_required');
    if (dryRun === 'false') {
      return this.importService.commit(file.buffer, user.id);
    }
    return this.importService.parseAndValidate(file.buffer);
  }

  @Get('export')
  @Roles(...EXPORT_ROLES)
  async exportCsv(@Res() res: Response) {
    const csv = await this.treatmentsService.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="treatments.csv"');
    res.send(csv);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    return this.treatmentsService.findOne(id, user);
  }

  @Post()
  @Roles(...TREATMENT_WRITE_ROLES)
  create(@Body() dto: CreateTreatmentDto, @CurrentUser() user: RequestUser) {
    return this.treatmentsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...TREATMENT_WRITE_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.treatmentsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(...DELETE_ROLES)
  remove(@Param('id') id: string) {
    return this.treatmentsService.remove(id);
  }

  @Patch(':id/validate')
  @Roles(...VALIDATE_ROLES)
  validate(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.treatmentsService.validate(id, user.id);
  }

  @Patch(':id/invalidate')
  @Roles(...VALIDATE_ROLES)
  invalidate(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.treatmentsService.invalidate(id, user.id);
  }

  @Patch(':id/mark-reviewed')
  @Roles(Role.ADMIN, Role.DPO)
  markReviewed(@Param('id') id: string) {
    return this.treatmentsService.markReviewed(id);
  }

  @Get(':id/export-pdf')
  @Roles(Role.ADMIN, Role.DPO)
  async exportPdf(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const locale = resolvePdfLocale(req);
    const buffer = await this.treatmentsService.exportPdf(id, user.id, locale);
    res.set({
      'Content-Type': 'application/pdf',
      // inline disposition lets the in-app preview iframe render the PDF;
      // explicit Download buttons use <a download> on the client, which the
      // browser honours regardless of disposition.
      'Content-Disposition': `inline; filename="traitement-${id}.pdf"`,
      // Override the global helmet `frame-ancestors 'none'` for this route
      // only — same-origin embedding is required for the preview dialog.
      'Content-Security-Policy': "frame-ancestors 'self'",
    });
    res.send(buffer);
  }
}
