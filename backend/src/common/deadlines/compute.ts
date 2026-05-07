import { DeadlineProfile, MS_PER_DAY, PROFILES } from './profiles';

export interface DeadlineInput {
  profile: DeadlineProfile;
  anchorAt: Date;
  pauses?: { pausedAt: Date; resumedAt: Date | null }[];
  extension?: { extraDays: number };
  customDays?: number; // REMEDIATION_CUSTOM
  now?: Date; // injectable for tests
}

export interface DeadlineResult {
  baseDeadline: Date;
  effectiveDeadline: Date; // base + accumulated pauses + extension
  daysRemaining: number; // negative when overdue
  isOverdue: boolean;
  isPaused: boolean;
  reminderTriggers: Date[]; // future, ascending, deadline-relative
}

export function computeDeadline(input: DeadlineInput): DeadlineResult {
  const profile = PROFILES[input.profile];
  const now = input.now ?? new Date();

  let spanMs: number;
  if (profile.spanMs !== null) {
    spanMs = profile.spanMs;
  } else {
    if (input.customDays === undefined) {
      throw new Error(`Profile ${input.profile} requires customDays`);
    }
    spanMs = input.customDays * MS_PER_DAY;
  }

  const baseDeadline = new Date(input.anchorAt.getTime() + spanMs);

  const pauses = input.pauses ?? [];
  let pausedShiftMs = 0;
  let isPaused = false;
  for (const p of pauses) {
    if (p.resumedAt) {
      pausedShiftMs += p.resumedAt.getTime() - p.pausedAt.getTime();
    } else {
      pausedShiftMs += now.getTime() - p.pausedAt.getTime();
      isPaused = true;
    }
  }

  let extensionShiftMs = 0;
  if (input.extension) {
    extensionShiftMs = input.extension.extraDays * MS_PER_DAY;
  }

  const effectiveDeadline = new Date(baseDeadline.getTime() + pausedShiftMs + extensionShiftMs);

  const remainingMs = effectiveDeadline.getTime() - now.getTime();
  const daysRemaining =
    remainingMs >= 0 ? Math.ceil(remainingMs / MS_PER_DAY) : Math.floor(remainingMs / MS_PER_DAY);
  const isOverdue = remainingMs < 0;

  const reminderTriggers = profile.reminderOffsetsMs
    .map(offset => new Date(effectiveDeadline.getTime() + offset))
    .filter(t => t.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    baseDeadline,
    effectiveDeadline,
    daysRemaining,
    isOverdue,
    isPaused,
    reminderTriggers,
  };
}
