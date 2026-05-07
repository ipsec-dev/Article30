import { describe, it, expect, beforeEach } from 'vitest';
import { resolveLocale } from '../../src/modules/mail/locale';

describe('resolveLocale', () => {
  beforeEach(() => {
    delete process.env.MAIL_DEFAULT_LOCALE;
  });

  it('returns fr when Accept-Language starts with fr', () => {
    expect(resolveLocale('fr-FR,fr;q=0.9')).toBe('fr');
  });

  it('returns en when Accept-Language starts with en', () => {
    expect(resolveLocale('en-US,en;q=0.9')).toBe('en');
  });

  it('falls back to MAIL_DEFAULT_LOCALE when header is unsupported', () => {
    process.env.MAIL_DEFAULT_LOCALE = 'fr';
    expect(resolveLocale('de-DE')).toBe('fr');
  });

  it('falls back to en when header is unsupported and env is unset', () => {
    expect(resolveLocale('de-DE')).toBe('en');
  });

  it('returns en when header is missing', () => {
    expect(resolveLocale(undefined)).toBe('en');
  });

  it('ignores env values that are neither en nor fr', () => {
    process.env.MAIL_DEFAULT_LOCALE = 'jp';
    expect(resolveLocale(undefined)).toBe('en');
  });
});
