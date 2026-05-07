import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AUDIT_ROLES, EXPORT_ROLES, VALIDATE_ROLES } from '@article30/shared';
import { ComplianceService } from './compliance.service';
import { ReportService } from './report.service';
import { AuditPackageService } from './audit-package.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { resolvePdfLocale } from '../../common/pdf/pdf-locale';

@ApiTags('compliance')
@Controller('compliance')
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly reportService: ReportService,
    private readonly auditPackageService: AuditPackageService,
  ) {}

  @Get('audit-package')
  @Roles(...EXPORT_ROLES)
  async getAuditPackage(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const locale = resolvePdfLocale(req);
    const buffer = await this.auditPackageService.generatePackage(user.id, locale);
    const date = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="audit-package-${date}.zip"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('report')
  @Roles(...AUDIT_ROLES)
  async getReport(@CurrentUser() user: RequestUser, @Req() req: Request, @Res() res: Response) {
    const locale = resolvePdfLocale(req);
    const buffer = await this.reportService.generateReport(user.id, locale);
    const date = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="compliance-report-${date}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('fine-exposure')
  computeFineExposure() {
    return this.complianceService.computeFineExposure();
  }

  @Get('score')
  computeScore() {
    return this.complianceService.computeScore();
  }

  @Get('snapshots')
  getSnapshots() {
    return this.complianceService.getSnapshots();
  }

  @Post('snapshot')
  @Roles(...VALIDATE_ROLES)
  createSnapshot() {
    return this.complianceService.createSnapshot();
  }
}
