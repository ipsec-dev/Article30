import { describe, it, expect } from 'vitest';
import { validatePasswordPolicy, PASSWORD_POLICY } from '../../src/modules/auth/password-policy';

describe('validatePasswordPolicy', () => {
  it('accepts a mixed-case password with digits at 12 chars', () => {
    expect(validatePasswordPolicy('Strongpass12')).toEqual({ ok: true });
  });

  it('rejects non-string input', () => {
    expect(validatePasswordPolicy(undefined as unknown as string)).toMatchObject({
      ok: false,
      reason: 'not_a_string',
    });
  });

  it('produces a generic "value must be a string" message on non-string input (decorator substitutes property name)', () => {
    const result = validatePasswordPolicy(42 as unknown as string);
    expect(result).toEqual({
      ok: false,
      reason: 'not_a_string',
      message: 'value must be a string',
    });
  });

  it('rejects too-short passwords', () => {
    expect(validatePasswordPolicy('Short1')).toMatchObject({ ok: false, reason: 'length' });
  });

  it('rejects too-long passwords', () => {
    expect(validatePasswordPolicy('a'.repeat(PASSWORD_POLICY.maxLength + 1))).toMatchObject({
      ok: false,
      reason: 'length',
    });
  });

  it('rejects passwords with fewer than two character classes', () => {
    expect(validatePasswordPolicy('alllowercaseletters')).toMatchObject({
      ok: false,
      reason: 'complexity',
    });
  });

  it('accepts passwords with at least two classes (letters + digits)', () => {
    expect(validatePasswordPolicy('abcdefghijkl1')).toEqual({ ok: true });
  });
});
