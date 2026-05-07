import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AUDIT_ROLES, WRITE_ROLES } from '@article30/shared';
import { ScreeningsService } from './screenings.service';
import { ScreeningsPdfService } from './screenings-pdf.service';
import { CreateScreeningDto } from './dto/create-screening.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { resolvePdfLocale } from '../../common/pdf/pdf-locale';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@ApiTags('screenings')
@Controller('screenings')
export class ScreeningsController {
  constructor(
    private readonly service: ScreeningsService,
    private readonly pdfService: ScreeningsPdfService,
  ) {}

  @Get()
  @Roles(...AUDIT_ROLES)
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
    return this.service.findAll(parsedPage, parsedLimit);
  }

  @Get(':id')
  @Roles(...AUDIT_ROLES)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Body() dto: CreateScreeningDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.id);
  }

  @Post(':id/convert')
  @Roles(...WRITE_ROLES)
  convert(@Param('id') id: string) {
    return this.service.convert(id);
  }

  @Get(':id/pdf')
  @Roles(...AUDIT_ROLES)
  async exportPdf(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const locale = resolvePdfLocale(req);
    const buffer = await this.pdfService.generatePdf(id, user.id, locale);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="screening-${id}.pdf"`,
      // Override the global helmet `frame-ancestors 'none'` for this route
      // only — required for the in-app PDF preview iframe.
      'Content-Security-Policy': "frame-ancestors 'self'",
    });
    res.send(buffer);
  }
}
