import { describe, it, expect } from 'vitest';
import { sha256Hex, chainNext } from '../../src/common/hash-chain';

describe('sha256-chain helpers', () => {
  it('sha256Hex computes the SHA-256 of a string as lowercase hex', () => {
    expect(sha256Hex('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('sha256Hex computes the SHA-256 of a Buffer', () => {
    const buf = Buffer.from('hello');
    expect(sha256Hex(buf)).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('chainNext combines previousHash + current payload deterministically', () => {
    const a = chainNext(null, 'first');
    const b = chainNext(a, 'second');
    const a2 = chainNext(null, 'first');
    expect(a).toBe(a2);
    expect(b).not.toBe(a);
  });

  it('chainNext treats undefined and null previousHash identically', () => {
    expect(chainNext(null, 'x')).toBe(chainNext(undefined, 'x'));
  });

  it('chainNext treats empty string as null/undefined (first link)', () => {
    expect(chainNext('', 'x')).toBe(chainNext(null, 'x'));
    expect(chainNext('', 'x')).toBe(chainNext(undefined, 'x'));
  });

  it('chainNext produces the same hash for a string payload and the equivalent Buffer payload', () => {
    expect(chainNext(null, 'first')).toBe(chainNext(null, Buffer.from('first', 'utf8')));
    const prev = chainNext(null, 'first');
    expect(chainNext(prev, 'second')).toBe(chainNext(prev, Buffer.from('second', 'utf8')));
  });
});
