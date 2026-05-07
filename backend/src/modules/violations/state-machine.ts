import { ViolationStatus } from '@prisma/client';

/**
 * Spec §6.2 — state machine for violations workflow.
 */
export const ALLOWED_TRANSITIONS: Record<ViolationStatus, ViolationStatus[]> = {
  RECEIVED: ['TRIAGED', 'DISMISSED'],
  TRIAGED: ['ASSESSED'],
  ASSESSED: ['CONTAINED', 'NOTIFICATION_PENDING'],
  CONTAINED: ['NOTIFICATION_PENDING'],
  NOTIFICATION_PENDING: ['NOTIFIED_CNIL', 'PERSONS_NOTIFICATION_WAIVED', 'REMEDIATED'],
  NOTIFIED_CNIL: ['PERSONS_NOTIFIED', 'PERSONS_NOTIFICATION_WAIVED', 'REMEDIATED'],
  PERSONS_NOTIFIED: ['REMEDIATED'],
  PERSONS_NOTIFICATION_WAIVED: ['REMEDIATED'],
  REMEDIATED: ['CLOSED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['TRIAGED', 'ASSESSED', 'CONTAINED', 'NOTIFICATION_PENDING', 'REMEDIATED'],
  DISMISSED: [], // terminal
};

export function validateTransition(from: ViolationStatus, to: ViolationStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export const TERMINAL_STATES: ReadonlySet<ViolationStatus> = new Set<ViolationStatus>([
  'DISMISSED',
]);
