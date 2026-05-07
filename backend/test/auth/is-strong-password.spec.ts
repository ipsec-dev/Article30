import { describe, it, expect } from 'vitest';
import type { ValidationArguments } from 'class-validator';
import { IsStrongPasswordConstraint } from '../../src/modules/auth/decorators/is-strong-password.decorator';

describe('IsStrongPasswordConstraint', () => {
  const constraint = new IsStrongPasswordConstraint();

  describe('validate()', () => {
    const cases: Array<[string, boolean, string]> = [
      ['', false, 'empty → reject (length)'],
      ['aaaaaaaaaaa', false, '11 lowercase → reject (length)'],
      ['aaaaaaaaaaaa', false, '12 lowercase only → reject (classes)'],
      ['aaaaaAAAAAAA', true, '12 lower+upper → accept'],
      ['aaaaaAAAA123', true, '12 lower+upper+digit → accept'],
      ['Aa1!Aa1!Aa1!', true, '12 all four classes → accept'],
      ['Correct-Horse-Battery-Staple-42', true, 'passphrase → accept'],
      ['a'.repeat(128), false, '128 lowercase only → reject (classes)'],
      ['a'.repeat(127) + 'A', true, '128 lower+upper → accept (boundary)'],
      ['a'.repeat(129), false, '129 chars → reject (length)'],
      ['áááááááááááá', false, '12 non-ASCII letters → reject (classes count only ASCII)'],
      [
        'aaaa\naaaaAAAA',
        true,
        'lower+upper + embedded newline → accept (newline ignored, 2 classes)',
      ],
      ['aaaaaaaaaaaa\n', false, 'all lowercase + newline → reject (newline is not a symbol)'],
    ];

    it.each(cases)('%s', (input, expected) => {
      expect(constraint.validate(input)).toBe(expected);
    });

    it('rejects non-string inputs', () => {
      expect(constraint.validate(42 as unknown as string)).toBe(false);
      expect(constraint.validate(null as unknown as string)).toBe(false);
      expect(constraint.validate(undefined as unknown as string)).toBe(false);
      expect(constraint.validate({} as unknown as string)).toBe(false);
    });
  });

  describe('defaultMessage()', () => {
    const args = (value: unknown): ValidationArguments =>
      ({
        value,
        property: 'password',
        constraints: [],
        targetName: '',
        object: {},
      }) as ValidationArguments;

    it('reports length failure when too short', () => {
      expect(constraint.defaultMessage(args('short'))).toBe(
        'password must be between 12 and 128 characters',
      );
    });

    it('reports length failure when too long', () => {
      expect(constraint.defaultMessage(args('a'.repeat(129)))).toBe(
        'password must be between 12 and 128 characters',
      );
    });

    it('reports class failure when length is OK but only one class present', () => {
      expect(constraint.defaultMessage(args('aaaaaaaaaaaa'))).toBe(
        'password must contain at least 2 of: lowercase letter, uppercase letter, digit, symbol',
      );
    });

    it('reports non-string when value is not a string', () => {
      expect(constraint.defaultMessage(args(42))).toBe('password must be a string');
    });

    it('prefers length message over class message when both fail', () => {
      // 11 chars + only lowercase — both length and class constraints fail.
      // Length should surface first so the user knows the most blocking issue.
      expect(constraint.defaultMessage(args('aaaaaaaaaaa'))).toBe(
        'password must be between 12 and 128 characters',
      );
    });
  });
});
