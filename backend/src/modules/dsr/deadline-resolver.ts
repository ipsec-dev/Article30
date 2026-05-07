import {
  computeDeadline,
  type DeadlineInput,
  type DeadlineProfile,
  type DeadlineResult,
} from '../../common/deadlines';
import type { DsrDeadlineProfile } from '@prisma/client';

const PROFILE_FOR_DSR: Record<DsrDeadlineProfile, DeadlineProfile> = {
  STANDARD_30D: 'DSR_STANDARD_30D',
  EXTENDED_90D: 'DSR_EXTENDED_90D',
  HEALTH_8D: 'DSR_HEALTH_8D',
  HEALTH_OLD_60D: 'DSR_HEALTH_OLD_60D',
};

export interface DsrDeadlineInput {
  receivedAt: Date;
  deadlineProfile: DsrDeadlineProfile;
  extensionGranted: boolean;
  extensionExtraDays?: number | null;
}

export function resolveDeadline(
  dsr: DsrDeadlineInput,
  pauses: { pausedAt: Date; resumedAt: Date | null }[],
  now: Date = new Date(),
): DeadlineResult {
  const input: DeadlineInput = {
    profile: PROFILE_FOR_DSR[dsr.deadlineProfile],
    anchorAt: dsr.receivedAt,
    pauses,
    extension:
      dsr.extensionGranted && dsr.extensionExtraDays
        ? { extraDays: dsr.extensionExtraDays }
        : undefined,
    now,
  };
  return computeDeadline(input);
}
