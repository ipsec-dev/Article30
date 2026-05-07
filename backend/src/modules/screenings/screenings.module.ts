import { Module } from '@nestjs/common';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsService } from './screenings.service';
import { ScreeningsPdfService } from './screenings-pdf.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [ScreeningsController],
  providers: [ScreeningsService, ScreeningsPdfService],
})
export class ScreeningsModule {}
