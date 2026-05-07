import { DsrStatus } from '@prisma/client';

export class DsrTransitionPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DsrTransitionPayloadError';
  }
}

const VALID_PAUSE_REASONS = ['IDENTITY_VERIFICATION', 'SCOPE_CLARIFICATION', 'OTHER'] as const;

const VALID_REJECTION_REASONS = [
  'MANIFESTLY_UNFOUNDED',
  'EXCESSIVE',
  'IDENTITY_UNVERIFIABLE',
  'REPEAT_NO_NEW_INFO',
  'LEGAL_BASIS_OVERRIDE',
] as const;

function ensureMinLength(value: unknown, min: number, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length < min) {
    throw new DsrTransitionPayloadError(
      `${fieldName} must be a string of at least ${min} characters`,
    );
  }
  return value;
}

function ensureOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new DsrTransitionPayloadError(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

export interface ValidatedAwaitingRequesterPayload {
  reason: (typeof VALID_PAUSE_REASONS)[number];
  reasonDetails?: string;
}

export interface ValidatedRespondedPayload {
  responseNotes: string;
}

export interface ValidatedPartiallyFulfilledPayload {
  partialFulfilmentNotes: string;
}

export interface ValidatedRejectedPayload {
  rejectionReason: (typeof VALID_REJECTION_REASONS)[number];
  rejectionDetails: string;
}

export interface ValidatedWithdrawnPayload {
  withdrawnReason?: string;
}

export const DSR_TRANSITION_VALIDATORS: Record<DsrStatus, (payload: unknown) => unknown> = {
  AWAITING_REQUESTER: payload => {
    const p = (payload ?? {}) as Record<string, unknown>;
    return {
      reason: ensureOneOf(p.reason, VALID_PAUSE_REASONS, 'reason'),
      reasonDetails: typeof p.reasonDetails === 'string' ? p.reasonDetails : undefined,
    };
  },
  RESPONDED: payload => {
    const p = (payload ?? {}) as Record<string, unknown>;
    return { responseNotes: ensureMinLength(p.responseNotes, 10, 'responseNotes') };
  },
  PARTIALLY_FULFILLED: payload => {
    const p = (payload ?? {}) as Record<string, unknown>;
    return {
      partialFulfilmentNotes: ensureMinLength(
        p.partialFulfilmentNotes,
        10,
        'partialFulfilmentNotes',
      ),
    };
  },
  REJECTED: payload => {
    const p = (payload ?? {}) as Record<string, unknown>;
    return {
      rejectionReason: ensureOneOf(p.rejectionReason, VALID_REJECTION_REASONS, 'rejectionReason'),
      rejectionDetails: ensureMinLength(p.rejectionDetails, 20, 'rejectionDetails'),
    };
  },
  WITHDRAWN: payload => {
    const p = (payload ?? {}) as Record<string, unknown>;
    return {
      withdrawnReason: typeof p.withdrawnReason === 'string' ? p.withdrawnReason : undefined,
    };
  },
  // No-payload targets:
  RECEIVED: () => ({}),
  ACKNOWLEDGED: () => ({}),
  IDENTITY_VERIFIED: () => ({}),
  IN_PROGRESS: () => ({}),
  CLOSED: () => ({}),
};
