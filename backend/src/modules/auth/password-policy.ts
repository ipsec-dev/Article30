import { PASSWORD_POLICY } from '@article30/shared';

const CHARACTER_CLASSES: ReadonlyArray<RegExp> = [/[a-z]/, /[A-Z]/, /\d/, /[!-/:-@[-`{-~]/];

type PolicyFailureReason = 'not_a_string' | 'length' | 'complexity';

export type PolicyResult =
  | { ok: true }
  | { ok: false; reason: PolicyFailureReason; message: string };

export { PASSWORD_POLICY };

export function validatePasswordPolicy(value: unknown): PolicyResult {
  if (typeof value !== 'string') {
    return { ok: false, reason: 'not_a_string', message: 'value must be a string' };
  }
  if (value.length < PASSWORD_POLICY.minLength || value.length > PASSWORD_POLICY.maxLength) {
    return {
      ok: false,
      reason: 'length',
      message: `value must be between ${PASSWORD_POLICY.minLength} and ${PASSWORD_POLICY.maxLength} characters`,
    };
  }
  const classCount = CHARACTER_CLASSES.filter(re => re.test(value)).length;
  if (classCount < PASSWORD_POLICY.minClasses) {
    return {
      ok: false,
      reason: 'complexity',
      message: `value must contain at least ${PASSWORD_POLICY.minClasses} of: lowercase letter, uppercase letter, digit, symbol`,
    };
  }
  return { ok: true };
}
