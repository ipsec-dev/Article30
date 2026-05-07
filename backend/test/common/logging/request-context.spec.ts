import { describe, it, expect } from 'vitest';
import { ClsModule, ClsServiceManager } from 'nestjs-cls';
import { Test } from '@nestjs/testing';
import { runWithJobContext } from '../../../src/common/logging/request-context';

describe('runWithJobContext', () => {
  it('seeds jobId and jobName into CLS for the duration of the callback', async () => {
    await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
    }).compile();

    let captured: { jobId?: string; jobName?: string } = {};
    await runWithJobContext({ jobName: 'rss-sync' }, async () => {
      const cls = ClsServiceManager.getClsService();
      captured = { jobId: cls.get('jobId'), jobName: cls.get('jobName') };
    });
    expect(captured.jobName).toBe('rss-sync');
    expect(captured.jobId).toMatch(/^[0-9A-Z]{26}$/);
  });
});
