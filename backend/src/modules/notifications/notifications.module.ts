import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationService } from './notification.service';
import { NotificationsScheduler } from './notifications.scheduler';
import { MailModule } from '../mail/mail.module';

@Module({
  // ScheduleModule.forRoot() is also mounted in AppModule. Re-importing here
  // keeps the scheduler discoverable when NotificationsModule is loaded in
  // isolation (e.g. unit tests) without affecting production wiring.
  imports: [MailModule, ScheduleModule.forRoot()],
  providers: [NotificationService, NotificationsScheduler],
  exports: [NotificationService],
})
export class NotificationsModule {}
