import { Module } from '@nestjs/common';
import { TreatmentsController } from './treatments.controller';
import { TreatmentsService } from './treatments.service';
import { TreatmentsImportService } from './treatments-import.service';
import { PdfExportService } from './pdf-export.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [TreatmentsController],
  providers: [TreatmentsService, TreatmentsImportService, PdfExportService],
})
export class TreatmentsModule {}
