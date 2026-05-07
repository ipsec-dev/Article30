import { DsrStatus } from '../types/dsr';

/**
 * DSR statuses where the deadline no longer applies — the case is concluded
 * one way or the other and should not appear in overdue lists or alerts.
 *
 * Used by AlertsService.getDsrDeadlines, DsrService.findAll(overdue:true), and
 * DsrService.getStats overdue counts.
 */
export const DSR_TERMINAL_STATUSES = [
  DsrStatus.RESPONDED,
  DsrStatus.CLOSED,
  DsrStatus.REJECTED,
  DsrStatus.WITHDRAWN,
  DsrStatus.PARTIALLY_FULFILLED,
] as const;

export type DsrTerminalStatus = (typeof DSR_TERMINAL_STATUSES)[number];
