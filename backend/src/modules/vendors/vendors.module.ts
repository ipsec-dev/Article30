import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { VendorAssessmentsService } from './vendor-assessments.service';
import { VendorQuestionnairePdfService } from './vendor-questionnaire-pdf.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditLogModule, NotificationsModule],
  controllers: [VendorsController],
  providers: [VendorsService, VendorAssessmentsService, VendorQuestionnairePdfService],
})
export class VendorsModule {}
