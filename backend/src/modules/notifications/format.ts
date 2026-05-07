import type { DsrType, Severity } from '@prisma/client';
import type { Locale } from '../mail/mail.service';

export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

const PARIS = 'Europe/Paris';

/** Render a Date as a locale-correct DATE-only string. */
export function formatDateLocale(date: Date, locale: Locale): string {
  if (locale === 'fr') {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: PARIS,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }
  // EN: keep ISO-ish YYYY-MM-DD which is unambiguous internationally.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PARIS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Render a Date with time, in Paris wall-clock, with an explicit TZ marker.
 *
 * Assembled from `formatToParts()` so the layout is fixed by *our* code, not by
 * ICU/Node locale data — which can drift across major versions and silently
 * change separators (e.g. add/remove commas).
 */
export function formatDateTimeLocale(date: Date, locale: Locale): string {
  const localeTag = locale === 'fr' ? 'fr-FR' : 'en-GB';
  const parts = new Intl.DateTimeFormat(localeTag, {
    timeZone: PARIS,
    day: '2-digit',
    month: locale === 'fr' ? '2-digit' : 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  // Pull only the parts we want; ignore literals/commas Intl injects.
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find(p => p.type === type)?.value ?? '';
  const day = get('day');
  const month = get('month');
  const year = get('year');
  const hour = get('hour');
  const minute = get('minute');
  const datePart = locale === 'fr' ? `${day}/${month}/${year}` : `${day} ${month} ${year}`;
  const timePart = `${hour}:${minute}`;
  const tzLabel = locale === 'fr' ? '(heure de Paris)' : '(Paris time)';
  return `${datePart} ${timePart} ${tzLabel}`;
}

const DSR_TYPE_LABELS: Record<Locale, Record<DsrType, string>> = {
  fr: {
    ACCESS: "Demande d'accès (Art. 15 RGPD)",
    RECTIFICATION: 'Demande de rectification (Art. 16 RGPD)',
    ERASURE: "Demande d'effacement (Art. 17 RGPD)",
    RESTRICTION: 'Demande de limitation (Art. 18 RGPD)',
    PORTABILITY: 'Demande de portabilité (Art. 20 RGPD)',
    OBJECTION: 'Opposition (Art. 21 RGPD)',
  },
  en: {
    ACCESS: 'Access request (Art. 15 GDPR)',
    RECTIFICATION: 'Rectification request (Art. 16 GDPR)',
    ERASURE: 'Erasure request (Art. 17 GDPR)',
    RESTRICTION: 'Restriction request (Art. 18 GDPR)',
    PORTABILITY: 'Portability request (Art. 20 GDPR)',
    OBJECTION: 'Objection (Art. 21 GDPR)',
  },
};

export function formatDsrType(type: DsrType, locale: Locale): string {
  return DSR_TYPE_LABELS[locale][type];
}

const SEVERITY_LABELS: Record<Locale, Record<Severity, string>> = {
  fr: { LOW: 'Faible', MEDIUM: 'Moyenne', HIGH: 'Élevée', CRITICAL: 'Critique' },
  en: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' },
};

export function formatSeverity(severity: Severity, locale: Locale): string {
  return SEVERITY_LABELS[locale][severity];
}

/** `KIND-12345678` — first 8 hex chars of the UUID, prefixed with the kind tag. */
export function shortRef(kindTag: string, id: string): string {
  return `${kindTag}-${id.slice(0, 8)}`;
}

export type RecipientRole = 'assignee' | 'dpo';

const FOOTER_ORIENTATION_LABELS: Record<Locale, Record<RecipientRole, (org: string) => string>> = {
  fr: {
    dpo: org =>
      org
        ? `Vous recevez cet e-mail en tant que DPO de ${org}.`
        : `Vous recevez cet e-mail en tant que DPO.`,
    assignee: () => `Vous recevez cet e-mail car cet élément vous est assigné.`,
  },
  en: {
    dpo: org =>
      org
        ? `You are receiving this email as the DPO of ${org}.`
        : `You are receiving this email as the DPO.`,
    assignee: () => `You are receiving this email because this item is assigned to you.`,
  },
};

export function buildFooterOrientation(
  role: RecipientRole,
  orgCompanyName: string,
  locale: Locale,
): string {
  return FOOTER_ORIENTATION_LABELS[locale][role](orgCompanyName);
}
