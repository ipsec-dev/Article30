import { describe, it, expect } from 'vitest';
import { ViolationStatus } from '@prisma/client';
import {
  ALLOWED_TRANSITIONS,
  validateTransition,
  TERMINAL_STATES,
} from '../../src/modules/violations/state-machine';
import {
  TRANSITION_VALIDATORS,
  TransitionPayloadError,
} from '../../src/modules/violations/transition-validators';

describe('Violations state machine', () => {
  describe('validateTransition', () => {
    // Build the (from, to) pairs to test
    const validEdges: [ViolationStatus, ViolationStatus][] = Object.entries(
      ALLOWED_TRANSITIONS,
    ).flatMap(([from, targets]) =>
      targets.map(
        to =>
          [from as ViolationStatus, to as ViolationStatus] as [ViolationStatus, ViolationStatus],
      ),
    );

    it.each(validEdges)('accepts %s → %s', (from, to) => {
      expect(validateTransition(from, to)).toBe(true);
    });

    it('rejects RECEIVED → REMEDIATED (must go through triage first)', () => {
      expect(validateTransition('RECEIVED', 'REMEDIATED')).toBe(false);
    });

    it('rejects TRIAGED → CLOSED (skipping the workflow)', () => {
      expect(validateTransition('TRIAGED', 'CLOSED')).toBe(false);
    });

    it('rejects DISMISSED → anything (terminal)', () => {
      expect(validateTransition('DISMISSED', 'TRIAGED')).toBe(false);
      expect(validateTransition('DISMISSED', 'REOPENED')).toBe(false);
    });

    it('rejects PERSONS_NOTIFIED → CLOSED (must go through REMEDIATED)', () => {
      expect(validateTransition('PERSONS_NOTIFIED', 'CLOSED')).toBe(false);
    });

    it('REOPENED can re-enter several non-terminal states', () => {
      expect(validateTransition('REOPENED', 'TRIAGED')).toBe(true);
      expect(validateTransition('REOPENED', 'ASSESSED')).toBe(true);
      expect(validateTransition('REOPENED', 'REMEDIATED')).toBe(true);
      expect(validateTransition('REOPENED', 'CLOSED')).toBe(false); // must go through REMEDIATED
    });

    it('every status in the enum has a transition row', () => {
      const allValues: ViolationStatus[] = [
        'RECEIVED',
        'TRIAGED',
        'DISMISSED',
        'ASSESSED',
        'CONTAINED',
        'NOTIFICATION_PENDING',
        'NOTIFIED_CNIL',
        'PERSONS_NOTIFIED',
        'PERSONS_NOTIFICATION_WAIVED',
        'REMEDIATED',
        'CLOSED',
        'REOPENED',
      ];
      for (const status of allValues) {
        expect(ALLOWED_TRANSITIONS[status]).toBeDefined();
      }
    });
  });

  describe('TERMINAL_STATES', () => {
    it('DISMISSED is terminal', () => {
      expect(TERMINAL_STATES.has('DISMISSED')).toBe(true);
    });
    it('CLOSED is NOT terminal (can REOPEN)', () => {
      expect(TERMINAL_STATES.has('CLOSED')).toBe(false);
    });
  });

  describe('TRANSITION_VALIDATORS', () => {
    describe('DISMISSED', () => {
      it('rejects missing dismissalReason', () => {
        expect(() => TRANSITION_VALIDATORS.DISMISSED({})).toThrow(TransitionPayloadError);
      });
      it('rejects too-short dismissalReason', () => {
        expect(() => TRANSITION_VALIDATORS.DISMISSED({ dismissalReason: 'too short' })).toThrow(
          /at least 10 characters/,
        );
      });
      it('accepts a valid dismissalReason', () => {
        const result = TRANSITION_VALIDATORS.DISMISSED({
          dismissalReason: 'Not actually a personal-data breach after triage',
        }) as { dismissalReason: string };
        expect(result.dismissalReason).toContain('Not actually');
      });
    });

    describe('NOTIFIED_CNIL', () => {
      it('rejects missing phase', () => {
        expect(() => TRANSITION_VALIDATORS.NOTIFIED_CNIL({ channel: 'PORTAL' })).toThrow(
          /phase must be one of/,
        );
      });
      it('rejects invalid phase', () => {
        expect(() =>
          TRANSITION_VALIDATORS.NOTIFIED_CNIL({ phase: 'BOGUS', channel: 'PORTAL' }),
        ).toThrow(/phase must be one of/);
      });
      it('rejects missing channel', () => {
        expect(() => TRANSITION_VALIDATORS.NOTIFIED_CNIL({ phase: 'INITIAL' })).toThrow(
          /channel must be one of/,
        );
      });
      it('accepts INITIAL with optional referenceNumber + delayJustification', () => {
        const result = TRANSITION_VALIDATORS.NOTIFIED_CNIL({
          phase: 'INITIAL',
          channel: 'PORTAL',
          referenceNumber: 'CNIL-2026-0042',
          delayJustification: 'Late identification due to forensic delay',
        }) as {
          phase: string;
          channel: string;
          referenceNumber?: string;
          delayJustification?: string;
        };
        expect(result.phase).toBe('INITIAL');
        expect(result.referenceNumber).toBe('CNIL-2026-0042');
      });
      it('accepts COMPLEMENTARY without referenceNumber', () => {
        const result = TRANSITION_VALIDATORS.NOTIFIED_CNIL({
          phase: 'COMPLEMENTARY',
          channel: 'EMAIL',
        }) as { phase: string };
        expect(result.phase).toBe('COMPLEMENTARY');
      });
    });

    describe('PERSONS_NOTIFICATION_WAIVED', () => {
      it('rejects missing ground', () => {
        expect(() =>
          TRANSITION_VALIDATORS.PERSONS_NOTIFICATION_WAIVED({
            justification: 'a'.repeat(30),
          }),
        ).toThrow(/ground must be one of/);
      });
      it('rejects invalid ground', () => {
        expect(() =>
          TRANSITION_VALIDATORS.PERSONS_NOTIFICATION_WAIVED({
            ground: 'NO_REASON',
            justification: 'a'.repeat(30),
          }),
        ).toThrow(/ground must be one of/);
      });
      it('rejects too-short justification', () => {
        expect(() =>
          TRANSITION_VALIDATORS.PERSONS_NOTIFICATION_WAIVED({
            ground: 'ENCRYPTION',
            justification: 'too short',
          }),
        ).toThrow(/at least 20 characters/);
      });
      it('accepts valid waiver', () => {
        const result = TRANSITION_VALIDATORS.PERSONS_NOTIFICATION_WAIVED({
          ground: 'ENCRYPTION',
          justification: 'Data was encrypted with state-of-the-art keys; risk mitigated.',
        }) as { ground: string };
        expect(result.ground).toBe('ENCRYPTION');
      });
    });

    describe('PERSONS_NOTIFIED', () => {
      it('rejects invalid method', () => {
        expect(() =>
          TRANSITION_VALIDATORS.PERSONS_NOTIFIED({
            method: 'CARRIER_PIGEON',
            recipientScope: 'all customers',
          }),
        ).toThrow(/method must be one of/);
      });
      it('rejects too-short recipientScope', () => {
        expect(() =>
          TRANSITION_VALIDATORS.PERSONS_NOTIFIED({ method: 'EMAIL', recipientScope: 'a' }),
        ).toThrow(/recipientScope/);
      });
      it('accepts valid payload', () => {
        const result = TRANSITION_VALIDATORS.PERSONS_NOTIFIED({
          method: 'EMAIL',
          recipientScope: 'all 12 000 customers in scope X',
        }) as { method: string };
        expect(result.method).toBe('EMAIL');
      });
    });

    describe('REOPENED', () => {
      it('rejects too-short rationale', () => {
        expect(() => TRANSITION_VALIDATORS.REOPENED({ rationale: 'short' })).toThrow(
          /at least 20 characters/,
        );
      });
      it('accepts valid rationale', () => {
        const result = TRANSITION_VALIDATORS.REOPENED({
          rationale: 'New evidence surfaced after closure; reopening to update assessment.',
        }) as { rationale: string };
        expect(result.rationale).toContain('New evidence');
      });
    });

    describe('CLOSED', () => {
      it('accepts empty payload (both fields optional)', () => {
        const result = TRANSITION_VALIDATORS.CLOSED({}) as {
          closureReason?: string;
          lessonsLearned?: string;
        };
        expect(result.closureReason).toBeUndefined();
        expect(result.lessonsLearned).toBeUndefined();
      });
      it('accepts both closureReason and lessonsLearned', () => {
        const result = TRANSITION_VALIDATORS.CLOSED({
          closureReason: 'Remediation verified by independent audit',
          lessonsLearned: 'Improve incident-detection latency',
        }) as { closureReason?: string };
        expect(result.closureReason).toContain('Remediation');
      });
    });

    describe('No-payload targets', () => {
      it.each([
        'RECEIVED',
        'TRIAGED',
        'ASSESSED',
        'CONTAINED',
        'NOTIFICATION_PENDING',
        'REMEDIATED',
      ] as const)('%s accepts empty payload', target => {
        expect(TRANSITION_VALIDATORS[target]({})).toEqual({});
      });
    });
  });
});
