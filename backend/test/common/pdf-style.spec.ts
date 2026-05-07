import { describe, expect, it } from 'vitest';
import { formatHashSeal } from '../../src/common/pdf/pdf-style';

describe('formatHashSeal', () => {
  it('formats a 64-char hash as first-4…last-4', () => {
    const full = 'a'.repeat(64);
    expect(formatHashSeal(full)).toBe('aaaa…aaaa');
  });

  it('passes through a short input unchanged', () => {
    expect(formatHashSeal('abc')).toBe('abc');
    expect(formatHashSeal('')).toBe('');
    expect(formatHashSeal('1234567')).toBe('1234567');
  });

  it('formats exactly 8 chars as first-4…last-4', () => {
    expect(formatHashSeal('abcdefgh')).toBe('abcd…efgh');
  });

  it('formats a realistic hex hash', () => {
    const hash = 'f3a210b9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8';
    expect(formatHashSeal(hash)).toBe('f3a2…e7f8');
  });
});
