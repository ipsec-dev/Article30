import { describe, it, expect } from 'vitest';
import { STRIP_PATHS, CENSOR_PATHS, isStripPath } from '../../../src/common/logging/redact-paths';

describe('redact-paths', () => {
  it('lists password-adjacent fields in STRIP_PATHS', () => {
    expect(STRIP_PATHS).toEqual(
      expect.arrayContaining([
        '*.password',
        '*.passwordHash',
        '*.resetToken',
        '*.sessionSecret',
        'req.headers.authorization',
        'req.headers.cookie',
      ]),
    );
  });

  it('lists PII fields in CENSOR_PATHS', () => {
    expect(CENSOR_PATHS).toEqual(
      expect.arrayContaining(['*.email', '*.phone', '*.remoteAddress', '*.ip']),
    );
  });

  it('isStripPath: true for password-adjacent leaf keys', () => {
    expect(isStripPath(['user', 'password'])).toBe(true);
    expect(isStripPath(['req', 'body', 'passwordHash'])).toBe(true);
    expect(isStripPath(['req', 'headers', 'authorization'])).toBe(true);
    expect(isStripPath(['req', 'headers', 'cookie'])).toBe(true);
  });

  it('isStripPath: false for PII leaf keys', () => {
    expect(isStripPath(['user', 'email'])).toBe(false);
    expect(isStripPath(['user', 'phone'])).toBe(false);
    expect(isStripPath(['req', 'ip'])).toBe(false);
  });
});

describe('redact-paths exhaustiveness', () => {
  it('every entry in STRIP_PATHS is recognized by isStripPath', () => {
    for (const path of STRIP_PATHS) {
      if (path.startsWith('req.headers.')) {
        const leaf = path.slice('req.headers.'.length);
        expect(isStripPath(['req', 'headers', leaf])).toBe(true);
      } else {
        // Bare ('password'), single-level ('*.password'), and multi-level
        // ('*.*.password') all resolve to a leaf that must be in STRIP_LEAF_KEYS.
        const leaf = path.replace(/^(\*\.)+/, '');
        // Simulate pino giving us the realized path with concrete container names.
        const realizedPath = path.startsWith('*.')
          ? ['outer', 'inner', leaf].slice(-path.split('.').length)
          : [leaf];
        expect(isStripPath(realizedPath)).toBe(true);
      }
    }
  });
});
