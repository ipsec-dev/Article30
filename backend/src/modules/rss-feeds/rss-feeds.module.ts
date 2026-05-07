import { Module } from '@nestjs/common';
import { RssFeedsController } from './rss-feeds.controller';
import { RssFeedsService } from './rss-feeds.service';

@Module({
  controllers: [RssFeedsController],
  providers: [RssFeedsService],
  exports: [RssFeedsService],
})
export class RssFeedsModule {}
