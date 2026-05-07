import { Module } from '@nestjs/common';
import { FollowUpModule } from '../follow-up/follow-up.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DsrController } from './dsr.controller';
import { DsrService } from './dsr.service';
import { DsrPauseService } from './dsr-pause.service';
import { DsrTreatmentProcessingService } from './dsr-treatment-processing.service';
import { RequesterCommunicationsService } from './requester-communications.service';

@Module({
  imports: [FollowUpModule, NotificationsModule],
  controllers: [DsrController],
  providers: [
    DsrService,
    DsrPauseService,
    DsrTreatmentProcessingService,
    RequesterCommunicationsService,
  ],
  exports: [DsrPauseService, DsrTreatmentProcessingService, RequesterCommunicationsService],
})
export class DsrModule {}
