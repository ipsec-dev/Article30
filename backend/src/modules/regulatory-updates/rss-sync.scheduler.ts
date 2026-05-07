import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { runWithJobContext } from '../../common/logging/request-context';
import { RegulatoryUpdatesService } from './regulatory-updates.service';

@Injectable()
export class RssSyncScheduler {
  private readonly logger = new Logger(RssSyncScheduler.name);

  constructor(private readonly regulatoryUpdatesService: RegulatoryUpdatesService) {}

  @Cron('0 8 * * *')
  async handleCron() {
    await runWithJobContext({ jobName: 'rss-sync' }, async () => {
      this.logger.debug({ event: 'rss.sync.started' });
      const result = await this.regulatoryUpdatesService.sync();
      this.logger.log({ event: 'rss.sync.completed', newEntries: result.newEntries });
    });
  }
}
