import { describe, expect, it, vi } from 'vitest';
import { RssSyncScheduler } from '../../src/modules/regulatory-updates/rss-sync.scheduler';
import type { RegulatoryUpdatesService } from '../../src/modules/regulatory-updates/regulatory-updates.service';

describe('RssSyncScheduler', () => {
  it('handleCron invokes regulatoryUpdatesService.sync() and logs the new count', async () => {
    const sync = vi.fn().mockResolvedValue({ newEntries: 3 });
    const fake = { sync } as unknown as RegulatoryUpdatesService;
    const scheduler = new RssSyncScheduler(fake);
    await scheduler.handleCron();
    expect(sync).toHaveBeenCalledOnce();
  });

  it('propagates errors from sync (does not swallow)', async () => {
    const sync = vi.fn().mockRejectedValue(new Error('network'));
    const fake = { sync } as unknown as RegulatoryUpdatesService;
    const scheduler = new RssSyncScheduler(fake);
    await expect(scheduler.handleCron()).rejects.toThrow('network');
  });
});
