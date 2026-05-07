import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('concatenates truthy class strings', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy inputs', () => {
    expect(cn('a', undefined, null, false, 'b')).toBe('a b');
  });

  it('resolves conflicting tailwind classes (tailwind-merge)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles object and array syntax via clsx', () => {
    expect(cn({ foo: true, bar: false }, ['baz'])).toBe('foo baz');
  });
});
