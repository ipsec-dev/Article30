import { ViolationStatus } from '@prisma/client';

export class TransitionPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransitionPayloadError';
  }
}

const VALID_NOTIFICATION_PHASES = ['INITIAL', 'COMPLEMENTARY'] as const;
const VALID_NOTIFICATION_CHANNELS = ['PORTAL', 'EMAIL', 'POST'] as const;
const VALID_PERSONS_METHODS = ['EMAIL', 'POST', 'PUBLIC_COMMUNICATION', 'IN_APP'] as const;
const VALID_WAIVER_GROUNDS = [
  'ENCRYPTION',
  'RISK_MITIGATED',
  'DISPROPORTIONATE_EFFORT_PUBLIC_COMM',
] as const;

function ensureMinLength(value: unknown, min: number, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length < min) {
    throw new TransitionPayloadError(`${fieldName} must be a string of at least ${min} characters`);
  }
  return value;
}

function ensureOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new TransitionPayloadError(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

export interface ValidatedDismissPayload {
  dismissalReason: string;
}

export interface ValidatedFileCnilPayload {
  phase: (typeof VALID_NOTIFICATION_PHASES)[number];
  channel: (typeof VALID_NOTIFICATION_CHANNELS)[number];
  referenceNumber?: string;
  delayJustification?: string;
}

export interface ValidatedPersonsNotifiedPayload {
  method: (typeof VALID_PERSONS_METHODS)[number];
  recipientScope: string;
}

export interface ValidatedWaiverPayload {
  ground: (typeof VALID_WAIVER_GROUNDS)[number];
  justification: string;
}

export interface ValidatedClosedPayload {
  closureReason?: string;
  lessonsLearned?: string;
}

export interface ValidatedReopenedPayload {
  rationale: string;
}

export const TRANSITION_VALIDATORS: Record<ViolationStatus, (payload: unknown) => unknown> = {
  DISMISSED: payload => {
    const p = (payload ?? {}) as Record<string, unknown>;
    return { dismissalReason: ensureMinLength(p.dismissalReason, 10, 'dismissalReason') };
  },
  NOTIFIED_CNIL: payload => {
    const p = (payload ?? {}) as Record<string, unknown>;
    const phase = ensureOneOf(p.phase, VALID_NOTIFICATION_PHASES, 'phase');
    const channel = ensureOneOf(p.channel, VALID_NOTIFICATION_CHANNELS, 'channel');
    const referenceNumber = typeof p.referenceNumber === 'string' ? p.referenceNumber : undefined;
    const delayJustification =
      typeof p.delayJustification === 'string' ? p.delayJustification : undefined;
    return { phase, channel, referenceNumber, delayJustification };
  },
  PERSONS_NOTIFIED: payload => {
    const p = (payload ?? {}) as Record<string, unknown>;
    return {
      method: ensureOneOf(p.method, VALID_PERSONS_METHODS, 'method'),
      recipientScope: ensureMinLength(p.recipientScope, 5, 'recipientScope'),
    };
  },
  PERSONS_NOTIFICATION_WAIVED: payload => {
    const p = (payload ?? {}) as Record<string, unknown>;
    return {
      ground: ensureOneOf(p.ground, VALID_WAIVER_GROUNDS, 'ground'),
      justification: ensureMinLength(p.justification, 20, 'justification'),
    };
  },
  REOPENED: payload => {
    const p = (payload ?? {}) as Record<string, unknown>;
    return { rationale: ensureMinLength(p.rationale, 20, 'rationale') };
  },
  CLOSED: payload => {
    const p = (payload ?? {}) as Record<string, unknown>;
    return {
      closureReason: typeof p.closureReason === 'string' ? p.closureReason : undefined,
      lessonsLearned: typeof p.lessonsLearned === 'string' ? p.lessonsLearned : undefined,
    };
  },
  // No-payload targets (transition just changes status):
  RECEIVED: () => ({}),
  TRIAGED: () => ({}),
  ASSESSED: () => ({}),
  CONTAINED: () => ({}),
  NOTIFICATION_PENDING: () => ({}),
  REMEDIATED: () => ({}),
};
