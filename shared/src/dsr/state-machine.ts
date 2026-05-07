/**
 * Frontend-friendly view of the DSR state machine.
 * Mirror of backend/src/modules/dsr/state-machine.ts DSR_ALLOWED_TRANSITIONS.
 * Kept in shared/ so the StateStrip + TransitionModal components can render
 * the same matrix the server enforces.
 */
export type DsrStateMachineStatus =
  | 'RECEIVED'
  | 'ACKNOWLEDGED'
  | 'AWAITING_REQUESTER'
  | 'IDENTITY_VERIFIED'
  | 'IN_PROGRESS'
  | 'RESPONDED'
  | 'PARTIALLY_FULFILLED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'CLOSED';

export const DSR_ALLOWED_TRANSITIONS: Record<DsrStateMachineStatus, DsrStateMachineStatus[]> = {
  RECEIVED: ['ACKNOWLEDGED', 'REJECTED', 'WITHDRAWN'],
  ACKNOWLEDGED: ['AWAITING_REQUESTER', 'IDENTITY_VERIFIED', 'REJECTED', 'WITHDRAWN'],
  AWAITING_REQUESTER: ['ACKNOWLEDGED', 'IDENTITY_VERIFIED'],
  IDENTITY_VERIFIED: ['IN_PROGRESS', 'AWAITING_REQUESTER', 'REJECTED', 'WITHDRAWN'],
  IN_PROGRESS: ['RESPONDED', 'PARTIALLY_FULFILLED', 'REJECTED', 'WITHDRAWN', 'AWAITING_REQUESTER'],
  RESPONDED: ['CLOSED'],
  PARTIALLY_FULFILLED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  WITHDRAWN: ['CLOSED'],
  CLOSED: [],
};

export function getDsrAvailableTransitions(
  current: DsrStateMachineStatus,
): DsrStateMachineStatus[] {
  return DSR_ALLOWED_TRANSITIONS[current] ?? [];
}
