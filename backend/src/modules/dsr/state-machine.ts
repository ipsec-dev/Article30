import { DsrStatus } from '@prisma/client';

/**
 * Spec §6.3 — state machine for DSR workflow.
 */
export const DSR_ALLOWED_TRANSITIONS: Record<DsrStatus, DsrStatus[]> = {
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

export function validateTransition(from: DsrStatus, to: DsrStatus): boolean {
  return DSR_ALLOWED_TRANSITIONS[from].includes(to);
}

export const DSR_TERMINAL_STATES: ReadonlySet<DsrStatus> = new Set<DsrStatus>(['CLOSED']);
