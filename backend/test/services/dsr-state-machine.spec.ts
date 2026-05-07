import { describe, it, expect } from 'vitest';
import { DsrStatus } from '@prisma/client';
import {
  DSR_ALLOWED_TRANSITIONS,
  validateTransition,
  DSR_TERMINAL_STATES,
} from '../../src/modules/dsr/state-machine';
import {
  DSR_TRANSITION_VALIDATORS,
  DsrTransitionPayloadError,
} from '../../src/modules/dsr/transition-validators';

describe('DSR state machine', () => {
  describe('validateTransition', () => {
    // Build the (from, to) pairs to test
    const validEdges: [DsrStatus, DsrStatus][] = Object.entries(DSR_ALLOWED_TRANSITIONS).flatMap(
      ([from, targets]) =>
        targets.map(to => [from as DsrStatus, to as DsrStatus] as [DsrStatus, DsrStatus]),
    );

    it.each(validEdges)('accepts %s → %s', (from, to) => {
      expect(validateTransition(from, to)).toBe(true);
    });

    it('rejects RECEIVED → IN_PROGRESS (must be acknowledged first)', () => {
      expect(validateTransition('RECEIVED', 'IN_PROGRESS')).toBe(false);
    });

    it('rejects RESPONDED → IN_PROGRESS (already responded)', () => {
      expect(validateTransition('RESPONDED', 'IN_PROGRESS')).toBe(false);
    });

    it('rejects CLOSED → RECEIVED (terminal state)', () => {
      expect(validateTransition('CLOSED', 'RECEIVED')).toBe(false);
    });

    it('rejects WITHDRAWN → IN_PROGRESS (can only close after withdrawal)', () => {
      expect(validateTransition('WITHDRAWN', 'IN_PROGRESS')).toBe(false);
    });

    it('every status in the enum has a transition row', () => {
      const allValues: DsrStatus[] = [
        'RECEIVED',
        'ACKNOWLEDGED',
        'AWAITING_REQUESTER',
        'IDENTITY_VERIFIED',
        'IN_PROGRESS',
        'RESPONDED',
        'PARTIALLY_FULFILLED',
        'REJECTED',
        'WITHDRAWN',
        'CLOSED',
      ];
      for (const status of allValues) {
        expect(DSR_ALLOWED_TRANSITIONS[status]).toBeDefined();
      }
    });
  });

  describe('DSR_TERMINAL_STATES', () => {
    it('CLOSED is terminal', () => {
      expect(DSR_TERMINAL_STATES.has('CLOSED')).toBe(true);
    });

    it('contains only CLOSED', () => {
      expect(DSR_TERMINAL_STATES.size).toBe(1);
    });

    it('REJECTED is NOT terminal (can be closed)', () => {
      expect(DSR_TERMINAL_STATES.has('REJECTED')).toBe(false);
    });
  });

  describe('DSR_TRANSITION_VALIDATORS', () => {
    describe('AWAITING_REQUESTER', () => {
      it('rejects missing reason', () => {
        expect(() => DSR_TRANSITION_VALIDATORS.AWAITING_REQUESTER({})).toThrow(
          DsrTransitionPayloadError,
        );
      });

      it('rejects invalid reason', () => {
        expect(() =>
          DSR_TRANSITION_VALIDATORS.AWAITING_REQUESTER({ reason: 'BOGUS_REASON' }),
        ).toThrow(/reason must be one of/);
      });

      it('accepts IDENTITY_VERIFICATION', () => {
        const result = DSR_TRANSITION_VALIDATORS.AWAITING_REQUESTER({
          reason: 'IDENTITY_VERIFICATION',
        }) as { reason: string };
        expect(result.reason).toBe('IDENTITY_VERIFICATION');
      });

      it('accepts SCOPE_CLARIFICATION', () => {
        const result = DSR_TRANSITION_VALIDATORS.AWAITING_REQUESTER({
          reason: 'SCOPE_CLARIFICATION',
        }) as { reason: string };
        expect(result.reason).toBe('SCOPE_CLARIFICATION');
      });

      it('accepts OTHER with optional reasonDetails', () => {
        const result = DSR_TRANSITION_VALIDATORS.AWAITING_REQUESTER({
          reason: 'OTHER',
          reasonDetails: 'Need more time for review',
        }) as { reason: string; reasonDetails?: string };
        expect(result.reason).toBe('OTHER');
        expect(result.reasonDetails).toBe('Need more time for review');
      });
    });

    describe('RESPONDED', () => {
      it('rejects missing responseNotes', () => {
        expect(() => DSR_TRANSITION_VALIDATORS.RESPONDED({})).toThrow(DsrTransitionPayloadError);
      });

      it('rejects responseNotes shorter than 10 chars', () => {
        expect(
          () => DSR_TRANSITION_VALIDATORS.RESPONDED({ responseNotes: '123456789' }), // 9 chars
        ).toThrow(/at least 10 characters/);
      });

      it('accepts responseNotes of exactly 10 chars', () => {
        const result = DSR_TRANSITION_VALIDATORS.RESPONDED({
          responseNotes: '1234567890',
        }) as { responseNotes: string };
        expect(result.responseNotes).toBe('1234567890');
      });

      it('accepts a longer responseNotes', () => {
        const result = DSR_TRANSITION_VALIDATORS.RESPONDED({
          responseNotes: 'All personal data has been exported and sent to the requester.',
        }) as { responseNotes: string };
        expect(result.responseNotes).toContain('All personal data');
      });
    });

    describe('PARTIALLY_FULFILLED', () => {
      it('rejects missing partialFulfilmentNotes', () => {
        expect(() => DSR_TRANSITION_VALIDATORS.PARTIALLY_FULFILLED({})).toThrow(
          DsrTransitionPayloadError,
        );
      });

      it('rejects partialFulfilmentNotes shorter than 10 chars', () => {
        expect(() =>
          DSR_TRANSITION_VALIDATORS.PARTIALLY_FULFILLED({ partialFulfilmentNotes: 'short' }),
        ).toThrow(/at least 10 characters/);
      });

      it('accepts partialFulfilmentNotes of exactly 10 chars', () => {
        const result = DSR_TRANSITION_VALIDATORS.PARTIALLY_FULFILLED({
          partialFulfilmentNotes: '1234567890',
        }) as { partialFulfilmentNotes: string };
        expect(result.partialFulfilmentNotes).toBe('1234567890');
      });

      it('accepts partialFulfilmentNotes of 10+ chars', () => {
        const result = DSR_TRANSITION_VALIDATORS.PARTIALLY_FULFILLED({
          partialFulfilmentNotes: 'Partial export provided; archived data not included.',
        }) as { partialFulfilmentNotes: string };
        expect(result.partialFulfilmentNotes).toContain('Partial export');
      });
    });

    describe('REJECTED', () => {
      it('rejects missing rejectionReason', () => {
        expect(() =>
          DSR_TRANSITION_VALIDATORS.REJECTED({
            rejectionDetails: 'This is a sufficiently long rejection detail.',
          }),
        ).toThrow(DsrTransitionPayloadError);
      });

      it('rejects unknown rejectionReason', () => {
        expect(() =>
          DSR_TRANSITION_VALIDATORS.REJECTED({
            rejectionReason: 'BOGUS',
            rejectionDetails: 'This is a sufficiently long rejection detail.',
          }),
        ).toThrow(/rejectionReason must be one of/);
      });

      it('rejects rejectionDetails shorter than 20 chars', () => {
        expect(() =>
          DSR_TRANSITION_VALIDATORS.REJECTED({
            rejectionReason: 'EXCESSIVE',
            rejectionDetails: 'too short',
          }),
        ).toThrow(/at least 20 characters/);
      });

      it('accepts valid rejectionReason + rejectionDetails combo', () => {
        const result = DSR_TRANSITION_VALIDATORS.REJECTED({
          rejectionReason: 'MANIFESTLY_UNFOUNDED',
          rejectionDetails: 'The request has no factual basis per our records.',
        }) as { rejectionReason: string; rejectionDetails: string };
        expect(result.rejectionReason).toBe('MANIFESTLY_UNFOUNDED');
        expect(result.rejectionDetails).toContain('no factual basis');
      });

      it.each([
        'MANIFESTLY_UNFOUNDED',
        'EXCESSIVE',
        'IDENTITY_UNVERIFIABLE',
        'REPEAT_NO_NEW_INFO',
        'LEGAL_BASIS_OVERRIDE',
      ] as const)('accepts rejectionReason %s', reason => {
        const result = DSR_TRANSITION_VALIDATORS.REJECTED({
          rejectionReason: reason,
          rejectionDetails: 'Detailed explanation of the rejection rationale.',
        }) as { rejectionReason: string };
        expect(result.rejectionReason).toBe(reason);
      });
    });

    describe('WITHDRAWN', () => {
      it('accepts empty payload (withdrawnReason optional)', () => {
        const result = DSR_TRANSITION_VALIDATORS.WITHDRAWN({}) as { withdrawnReason?: string };
        expect(result.withdrawnReason).toBeUndefined();
      });

      it('accepts optional withdrawnReason when provided', () => {
        const result = DSR_TRANSITION_VALIDATORS.WITHDRAWN({
          withdrawnReason: 'Requester changed their mind.',
        }) as { withdrawnReason?: string };
        expect(result.withdrawnReason).toBe('Requester changed their mind.');
      });
    });

    describe('CLOSED', () => {
      it('accepts empty payload', () => {
        const result = DSR_TRANSITION_VALIDATORS.CLOSED({});
        expect(result).toEqual({});
      });
    });

    describe('No-payload targets', () => {
      it.each(['RECEIVED', 'ACKNOWLEDGED', 'IDENTITY_VERIFIED', 'IN_PROGRESS'] as const)(
        '%s accepts empty payload',
        target => {
          expect(DSR_TRANSITION_VALIDATORS[target]({})).toEqual({});
        },
      );
    });
  });
});
