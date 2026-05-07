import { Module } from '@nestjs/common';
import { RegulatoryUpdatesController } from './regulatory-updates.controller';
import { RegulatoryUpdatesService } from './regulatory-updates.service';
import { RssSyncScheduler } from './rss-sync.scheduler';

@Module({
  controllers: [RegulatoryUpdatesController],
  providers: [RegulatoryUpdatesService, RssSyncScheduler],
  exports: [RegulatoryUpdatesService],
})
export class RegulatoryUpdatesModule {}
