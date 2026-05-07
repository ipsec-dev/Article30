import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggingModule } from './common/logging/logging.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthGuard } from './common/guards/auth.guard';
import { ApprovedGuard } from './common/guards/approved.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TreatmentsModule } from './modules/treatments/treatments.module';
import { ChecklistModule } from './modules/checklist/checklist.module';
import { ViolationsModule } from './modules/violations/violations.module';
import { DsrModule } from './modules/dsr/dsr.module';
import { RecitalsModule } from './modules/recitals/recitals.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { RegulatoryUpdatesModule } from './modules/regulatory-updates/regulatory-updates.module';
import { RssFeedsModule } from './modules/rss-feeds/rss-feeds.module';
import { ScreeningsModule } from './modules/screenings/screenings.module';
import { MailModule } from './modules/mail/mail.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ConfigModule } from './modules/config/config.module';
import { HealthModule } from './modules/health/health.module';
import { FollowUpModule } from './modules/follow-up/follow-up.module';

@Module({
  imports: [
    LoggingModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditLogModule,
    AuthModule,
    UsersModule,
    TreatmentsModule,
    ChecklistModule,
    ViolationsModule,
    DsrModule,
    RecitalsModule,
    ArticlesModule,
    OrganizationModule,
    ComplianceModule,
    AlertsModule,
    DocumentsModule,
    VendorsModule,
    RegulatoryUpdatesModule,
    RssFeedsModule,
    ScreeningsModule,
    MailModule,
    NotificationsModule,
    ConfigModule,
    HealthModule,
    FollowUpModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: ApprovedGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
