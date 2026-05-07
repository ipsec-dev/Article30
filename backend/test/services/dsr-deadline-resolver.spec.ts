import { describe, it, expect } from 'vitest';
import { resolveDeadline } from '../../src/modules/dsr/deadline-resolver';
import { computeDeadline } from '../../src/common/deadlines/compute';

const MS_PER_DAY = 86_400_000;

const RECEIVED_AT = new Date('2026-04-01T00:00:00Z');
const NOW = new Date('2026-04-15T00:00:00Z');

describe('resolveDeadline', () => {
  // Test 1: STANDARD_30D, no pauses, no extension → matches plain computeDeadline output
  it('STANDARD_30D, no pauses, no extension — matches computeDeadline directly', () => {
    const result = resolveDeadline(
      { receivedAt: RECEIVED_AT, deadlineProfile: 'STANDARD_30D', extensionGranted: false },
      [],
      NOW,
    );
    const expected = computeDeadline({
      profile: 'DSR_STANDARD_30D',
      anchorAt: RECEIVED_AT,
      now: NOW,
    });
    expect(result.baseDeadline.toISOString()).toBe(expected.baseDeadline.toISOString());
    expect(result.effectiveDeadline.toISOString()).toBe(expected.effectiveDeadline.toISOString());
    expect(result.daysRemaining).toBe(expected.daysRemaining);
    expect(result.isOverdue).toBe(expected.isOverdue);
    expect(result.isPaused).toBe(expected.isPaused);
  });

  // Test 2: STANDARD_30D + open pause shifts effectiveDeadline forward
  it('STANDARD_30D + open pause — effectiveDeadline shifts forward and isPaused=true', () => {
    const pausedAt = new Date('2026-04-05T00:00:00Z');
    const result = resolveDeadline(
      { receivedAt: RECEIVED_AT, deadlineProfile: 'STANDARD_30D', extensionGranted: false },
      [{ pausedAt, resumedAt: null }],
      NOW,
    );
    const expected = computeDeadline({
      profile: 'DSR_STANDARD_30D',
      anchorAt: RECEIVED_AT,
      pauses: [{ pausedAt, resumedAt: null }],
      now: NOW,
    });
    expect(result.effectiveDeadline.toISOString()).toBe(expected.effectiveDeadline.toISOString());
    expect(result.isPaused).toBe(true);
    // effective is 10 days past base (NOW - pausedAt = 10 days)
    const shiftMs = result.effectiveDeadline.getTime() - result.baseDeadline.getTime();
    expect(shiftMs).toBe(10 * MS_PER_DAY);
  });

  // Test 3: STANDARD_30D + closed pause adds the closed-span to effectiveDeadline
  it('STANDARD_30D + closed pause — effectiveDeadline offset equals pause span', () => {
    const pausedAt = new Date('2026-04-05T00:00:00Z');
    const resumedAt = new Date('2026-04-10T00:00:00Z');
    const result = resolveDeadline(
      { receivedAt: RECEIVED_AT, deadlineProfile: 'STANDARD_30D', extensionGranted: false },
      [{ pausedAt, resumedAt }],
      NOW,
    );
    expect(result.isPaused).toBe(false);
    const shiftMs = result.effectiveDeadline.getTime() - result.baseDeadline.getTime();
    expect(shiftMs).toBe(5 * MS_PER_DAY);
  });

  // Test 4: EXTENDED_90D + extension extraDays=60 → effectiveDeadline = base + 60d
  it('EXTENDED_90D + extensionGranted + extraDays=60 — deadline shifts 60 days past base', () => {
    const result = resolveDeadline(
      {
        receivedAt: RECEIVED_AT,
        deadlineProfile: 'EXTENDED_90D',
        extensionGranted: true,
        extensionExtraDays: 60,
      },
      [],
      NOW,
    );
    const shiftMs = result.effectiveDeadline.getTime() - result.baseDeadline.getTime();
    expect(shiftMs).toBe(60 * MS_PER_DAY);
    // base = receivedAt + 90d
    expect(result.baseDeadline.toISOString()).toBe(
      new Date(RECEIVED_AT.getTime() + 90 * MS_PER_DAY).toISOString(),
    );
  });

  // Test 5: HEALTH_8D → 8-day deadline
  it('HEALTH_8D — base deadline is 8 days after receivedAt', () => {
    const result = resolveDeadline(
      { receivedAt: RECEIVED_AT, deadlineProfile: 'HEALTH_8D', extensionGranted: false },
      [],
      NOW,
    );
    expect(result.baseDeadline.toISOString()).toBe(
      new Date(RECEIVED_AT.getTime() + 8 * MS_PER_DAY).toISOString(),
    );
    // 8 days from Apr 1 = Apr 9, now is Apr 15 → overdue
    expect(result.isOverdue).toBe(true);
  });

  // Test 6: HEALTH_OLD_60D → 60-day deadline
  it('HEALTH_OLD_60D — base deadline is 60 days after receivedAt', () => {
    const result = resolveDeadline(
      { receivedAt: RECEIVED_AT, deadlineProfile: 'HEALTH_OLD_60D', extensionGranted: false },
      [],
      NOW,
    );
    expect(result.baseDeadline.toISOString()).toBe(
      new Date(RECEIVED_AT.getTime() + 60 * MS_PER_DAY).toISOString(),
    );
    expect(result.isOverdue).toBe(false);
  });

  // Test 7: Multiple pauses accumulate
  it('multiple pauses — shifts accumulate additively', () => {
    const pauses = [
      { pausedAt: new Date('2026-04-02T00:00:00Z'), resumedAt: new Date('2026-04-04T00:00:00Z') }, // 2d
      { pausedAt: new Date('2026-04-06T00:00:00Z'), resumedAt: new Date('2026-04-09T00:00:00Z') }, // 3d
    ];
    const result = resolveDeadline(
      { receivedAt: RECEIVED_AT, deadlineProfile: 'STANDARD_30D', extensionGranted: false },
      pauses,
      NOW,
    );
    const shiftMs = result.effectiveDeadline.getTime() - result.baseDeadline.getTime();
    expect(shiftMs).toBe(5 * MS_PER_DAY); // 2 + 3
    expect(result.isPaused).toBe(false);
  });

  // Test 8: extensionGranted=true but extensionExtraDays=null → no extension shift
  it('extensionGranted=true but extensionExtraDays=null — no extension applied', () => {
    const withNull = resolveDeadline(
      {
        receivedAt: RECEIVED_AT,
        deadlineProfile: 'STANDARD_30D',
        extensionGranted: true,
        extensionExtraDays: null,
      },
      [],
      NOW,
    );
    const withoutExtension = resolveDeadline(
      { receivedAt: RECEIVED_AT, deadlineProfile: 'STANDARD_30D', extensionGranted: false },
      [],
      NOW,
    );
    expect(withNull.effectiveDeadline.toISOString()).toBe(
      withoutExtension.effectiveDeadline.toISOString(),
    );
    expect(withNull.baseDeadline.toISOString()).toBe(withoutExtension.baseDeadline.toISOString());
  });
});
