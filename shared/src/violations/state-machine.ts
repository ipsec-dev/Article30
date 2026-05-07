/**
 * Frontend-friendly view of the violations state machine.
 * Mirror of backend/src/modules/violations/state-machine.ts ALLOWED_TRANSITIONS.
 * Kept in shared/ so the StateStrip + TransitionModal components can render
 * the same matrix the server enforces.
 */
export type ViolationStateMachineStatus =
  | 'RECEIVED'
  | 'TRIAGED'
  | 'DISMISSED'
  | 'ASSESSED'
  | 'CONTAINED'
  | 'NOTIFICATION_PENDING'
  | 'NOTIFIED_CNIL'
  | 'PERSONS_NOTIFIED'
  | 'PERSONS_NOTIFICATION_WAIVED'
  | 'REMEDIATED'
  | 'CLOSED'
  | 'REOPENED';

export const VIOLATION_ALLOWED_TRANSITIONS: Record<
  ViolationStateMachineStatus,
  ViolationStateMachineStatus[]
> = {
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
  DISMISSED: [],
};

export function getAvailableTransitions(
  current: ViolationStateMachineStatus,
): ViolationStateMachineStatus[] {
  return VIOLATION_ALLOWED_TRANSITIONS[current] ?? [];
}
