import type { Locale } from '../mail/mail.service';

// Org locale is non-null in the schema (default 'fr'), but the helper is
// defensive against the value being read off a partial select.

export function resolveRecipientLocale(orgLocale: string | null | undefined): Locale {
  if (orgLocale === 'en') return 'en';
  return 'fr';
}
