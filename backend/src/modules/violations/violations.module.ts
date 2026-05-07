import { Module } from '@nestjs/common';
import { FollowUpModule } from '../follow-up/follow-up.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ViolationsController } from './violations.controller';
import { ViolationsService } from './violations.service';
import { BreachRiskAssessmentService } from './breach-risk-assessment.service';
import { BreachNotificationsService } from './breach-notifications.service';
import { RegulatorInteractionsService } from './regulator-interactions.service';
import { RemediationService } from './remediation.service';

@Module({
  imports: [FollowUpModule, NotificationsModule],
  controllers: [ViolationsController],
  providers: [
    ViolationsService,
    BreachRiskAssessmentService,
    BreachNotificationsService,
    RegulatorInteractionsService,
    RemediationService,
  ],
  exports: [
    BreachRiskAssessmentService,
    BreachNotificationsService,
    RegulatorInteractionsService,
    RemediationService,
  ],
})
export class ViolationsModule {}
