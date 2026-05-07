import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Locale, TemplateId } from './mail.service';

const VALID_TEMPLATE_IDS: ReadonlySet<TemplateId> = new Set([
  'password-reset',
  'password-changed',
  'user-invite',
  'admin-password-reset',
  'dsr-submitted',
  'dsr-deadline',
  'violation-logged',
  'violation-72h-kickoff',
  'violation-72h',
  'vendor-questionnaire-returned',
  'vendor-dpa-expiring',
  'treatment-review-due',
  'action-item-assigned',
]);
const VALID_LOCALES: ReadonlySet<Locale> = new Set(['en', 'fr']);

export interface LoadedTemplate {
  subject: string;
  body: string;
}

const templateCache = new Map<string, LoadedTemplate>();

function readTemplateFile(id: TemplateId, locale: Locale): LoadedTemplate {
  const path = join(__dirname, 'templates', `${id}.${locale}.txt`);
  // Normalise CRLF so templates edited on Windows still split correctly.
  const raw = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
  const splitIndex = raw.indexOf('\n\n');
  if (splitIndex === -1) {
    throw new Error(`Template ${id}.${locale} is missing the subject/body separator`);
  }
  const subject = raw.slice(0, splitIndex).trim();
  const body = raw.slice(splitIndex + 2).trimEnd();
  return { subject, body };
}

export function loadTemplate(id: TemplateId, locale: Locale): LoadedTemplate {
  if (!VALID_TEMPLATE_IDS.has(id)) {
    throw new Error(`Unknown template id: ${id}`);
  }
  if (!VALID_LOCALES.has(locale)) {
    throw new Error(`Unknown locale: ${locale}`);
  }
  const cacheKey = `${id}.${locale}`;
  const cached = templateCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const loaded = readTemplateFile(id, locale);
  templateCache.set(cacheKey, loaded);
  return loaded;
}

export function renderTemplate(
  template: LoadedTemplate,
  context: Record<string, string>,
): LoadedTemplate {
  const replace = (text: string): string =>
    text.replaceAll(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      if (Object.hasOwn(context, key)) {
        return context[key];
      }
      return `{{${key}}}`;
    });
  return {
    subject: replace(template.subject),
    body: replace(template.body),
  };
}
