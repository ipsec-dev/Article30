import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { ReportService } from './report.service';
import { AuditPackageService } from './audit-package.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuditLogModule],
  controllers: [ComplianceController],
  providers: [ComplianceService, ReportService, AuditPackageService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
