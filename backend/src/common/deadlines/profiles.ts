export type DeadlineProfile =
  | 'BREACH_CNIL_72H'
  | 'DSR_STANDARD_30D'
  | 'DSR_EXTENDED_90D'
  | 'DSR_HEALTH_8D'
  | 'DSR_HEALTH_OLD_60D'
  | 'REMEDIATION_CUSTOM';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const MS_PER_HOUR = HOUR;
export const MS_PER_DAY = DAY;

export interface ProfileDefinition {
  /** Total span from anchor to base deadline, in milliseconds. customDays overrides for REMEDIATION_CUSTOM. */
  spanMs: number | null;
  /** Reminder offsets relative to the (effective) deadline, in milliseconds.
   *  Negative = before the deadline. Zero = at the deadline. Positive = after (escalation). */
  reminderOffsetsMs: number[];
}

export const PROFILES: Record<DeadlineProfile, ProfileDefinition> = {
  BREACH_CNIL_72H: {
    spanMs: 72 * HOUR,
    reminderOffsetsMs: [-24 * HOUR, -12 * HOUR, -1 * HOUR],
  },
  DSR_STANDARD_30D: {
    spanMs: 30 * DAY,
    reminderOffsetsMs: [-7 * DAY, -3 * DAY, -1 * DAY],
  },
  DSR_EXTENDED_90D: {
    spanMs: 90 * DAY,
    reminderOffsetsMs: [-14 * DAY, -7 * DAY, -1 * DAY],
  },
  DSR_HEALTH_8D: {
    spanMs: 8 * DAY,
    reminderOffsetsMs: [-3 * DAY, -1 * DAY],
  },
  DSR_HEALTH_OLD_60D: {
    spanMs: 60 * DAY,
    reminderOffsetsMs: [-7 * DAY, -3 * DAY, -1 * DAY],
  },
  REMEDIATION_CUSTOM: {
    spanMs: null,
    reminderOffsetsMs: [-7 * DAY, -1 * DAY],
  },
};
