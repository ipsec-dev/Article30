import type { Locale } from './mail.service';

export function resolveLocale(acceptLanguage: string | undefined): Locale {
  const value = (acceptLanguage ?? '').toLowerCase();
  if (value.startsWith('fr')) {
    return 'fr';
  }
  if (value.startsWith('en')) {
    return 'en';
  }
  const fallback = (process.env.MAIL_DEFAULT_LOCALE ?? 'en').toLowerCase();
  if (fallback === 'fr') {
    return 'fr';
  }
  return 'en';
}
