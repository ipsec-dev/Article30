import { describe, it, expect } from 'vitest';
import { emailHash } from '../../../src/common/logging/email-hash';

describe('emailHash', () => {
  it('returns 10 lowercase hex chars for a normal email', () => {
    const h = emailHash('alice@example.com');
    expect(h).toMatch(/^[0-9a-f]{10}$/);
  });

  it('is stable: same input -> same output', () => {
    expect(emailHash('a@b.c')).toBe(emailHash('a@b.c'));
  });

  it('is case-insensitive (Alice@Example.com === alice@example.com)', () => {
    expect(emailHash('Alice@Example.com')).toBe(emailHash('alice@example.com'));
  });

  it('trims whitespace', () => {
    expect(emailHash('  a@b.c  ')).toBe(emailHash('a@b.c'));
  });
});
