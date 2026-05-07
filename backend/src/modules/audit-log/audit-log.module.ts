import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';

@Global()
@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor }],
  exports: [AuditLogService],
})
export class AuditLogModule {}
