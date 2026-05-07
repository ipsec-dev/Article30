import { describe, it, expect } from 'vitest';
import { computeDeadline } from '../../src/common/deadlines/compute';

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

describe('computeDeadline — DSR_STANDARD_30D', () => {
  it('no pauses, no extension, well before deadline', () => {
    const r = computeDeadline({
      profile: 'DSR_STANDARD_30D',
      anchorAt: new Date('2026-04-01T00:00:00Z'),
      now: new Date('2026-04-10T00:00:00Z'),
    });
    expect(r.baseDeadline.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(r.effectiveDeadline.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(r.daysRemaining).toBe(21);
    expect(r.isOverdue).toBe(false);
    expect(r.isPaused).toBe(false);
  });

  it('overdue', () => {
    const r = computeDeadline({
      profile: 'DSR_STANDARD_30D',
      anchorAt: new Date('2026-03-01T00:00:00Z'),
      now: new Date('2026-04-15T00:00:00Z'),
    });
    expect(r.isOverdue).toBe(true);
    expect(r.daysRemaining).toBeLessThan(0);
  });

  it('open pause shifts effectiveDeadline forward and isPaused=true', () => {
    const r = computeDeadline({
      profile: 'DSR_STANDARD_30D',
      anchorAt: new Date('2026-04-01T00:00:00Z'),
      now: new Date('2026-04-15T00:00:00Z'),
      pauses: [{ pausedAt: new Date('2026-04-05T00:00:00Z'), resumedAt: null }],
    });
    expect(r.isPaused).toBe(true);
    const baseMs = r.baseDeadline.getTime();
    const effectiveMs = r.effectiveDeadline.getTime();
    expect(effectiveMs - baseMs).toBeGreaterThanOrEqual(10 * MS_PER_DAY - 1);
  });

  it('closed pause adds the paused span', () => {
    const r = computeDeadline({
      profile: 'DSR_STANDARD_30D',
      anchorAt: new Date('2026-04-01T00:00:00Z'),
      now: new Date('2026-04-20T00:00:00Z'),
      pauses: [
        {
          pausedAt: new Date('2026-04-05T00:00:00Z'),
          resumedAt: new Date('2026-04-10T00:00:00Z'),
        },
      ],
    });
    const baseMs = r.baseDeadline.getTime();
    const effectiveMs = r.effectiveDeadline.getTime();
    expect(effectiveMs - baseMs).toBe(5 * MS_PER_DAY);
    expect(r.isPaused).toBe(false);
  });

  it('extension grants extra days and the deadline shifts', () => {
    const r = computeDeadline({
      profile: 'DSR_STANDARD_30D',
      anchorAt: new Date('2026-04-01T00:00:00Z'),
      now: new Date('2026-04-15T00:00:00Z'),
      extension: { extraDays: 60 },
    });
    const baseMs = r.baseDeadline.getTime();
    const effectiveMs = r.effectiveDeadline.getTime();
    expect(effectiveMs - baseMs).toBe(60 * MS_PER_DAY);
  });
});

describe('computeDeadline — BREACH_CNIL_72H', () => {
  it('exactly at deadline → daysRemaining=0, not overdue', () => {
    const anchor = new Date('2026-04-01T00:00:00Z');
    const r = computeDeadline({
      profile: 'BREACH_CNIL_72H',
      anchorAt: anchor,
      now: new Date(anchor.getTime() + 72 * MS_PER_HOUR),
    });
    expect(r.isOverdue).toBe(false);
    expect(r.daysRemaining).toBe(0);
  });

  it('one minute past deadline → overdue', () => {
    const anchor = new Date('2026-04-01T00:00:00Z');
    const r = computeDeadline({
      profile: 'BREACH_CNIL_72H',
      anchorAt: anchor,
      now: new Date(anchor.getTime() + 72 * MS_PER_HOUR + 60_000),
    });
    expect(r.isOverdue).toBe(true);
    expect(r.daysRemaining).toBeLessThan(0);
    expect(r.daysRemaining).toBe(-1);
  });

  it('reminderTriggers at T-24h, T-12h, T-1h (future-only, ascending)', () => {
    const anchor = new Date('2026-04-01T00:00:00Z');
    const r = computeDeadline({
      profile: 'BREACH_CNIL_72H',
      anchorAt: anchor,
      now: anchor,
    });
    expect(r.reminderTriggers).toHaveLength(3);
    const expected48h = new Date(anchor.getTime() + 48 * MS_PER_HOUR).getTime();
    const expected60h = new Date(anchor.getTime() + 60 * MS_PER_HOUR).getTime();
    const expected71h = new Date(anchor.getTime() + 71 * MS_PER_HOUR).getTime();
    expect(r.reminderTriggers[0].getTime()).toBe(expected48h);
    expect(r.reminderTriggers[1].getTime()).toBe(expected60h);
    expect(r.reminderTriggers[2].getTime()).toBe(expected71h);
  });
});

describe('computeDeadline — DSR_HEALTH_8D', () => {
  it('uses 8-day window', () => {
    const r = computeDeadline({
      profile: 'DSR_HEALTH_8D',
      anchorAt: new Date('2026-04-01T00:00:00Z'),
      now: new Date('2026-04-01T00:00:00Z'),
    });
    expect(r.daysRemaining).toBe(8);
  });
});

describe('computeDeadline — REMEDIATION_CUSTOM', () => {
  it('uses customDays', () => {
    const r = computeDeadline({
      profile: 'REMEDIATION_CUSTOM',
      anchorAt: new Date('2026-04-01T00:00:00Z'),
      now: new Date('2026-04-01T00:00:00Z'),
      customDays: 14,
    });
    expect(r.daysRemaining).toBe(14);
  });

  it('throws when customDays is missing', () => {
    expect(() =>
      computeDeadline({
        profile: 'REMEDIATION_CUSTOM',
        anchorAt: new Date('2026-04-01T00:00:00Z'),
        now: new Date('2026-04-01T00:00:00Z'),
      }),
    ).toThrow(/customDays/);
  });
});
