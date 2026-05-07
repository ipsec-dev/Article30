import type { Request } from 'express';
import type { PdfLocale } from './pdf-style';

const VALID: ReadonlySet<PdfLocale> = new Set(['fr', 'en']);

function normalize(value: string | undefined): PdfLocale | null {
  if (!value) return null;
  const lower = value.toLowerCase().trim();
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('en')) return 'en';
  return null;
}

/**
 * Resolves the PDF output locale from an HTTP request. Priority:
 *   1. `?locale=` query string (set by the frontend so window.open() works)
 *   2. `Accept-Language` header (browser default)
 *   3. Fallback `fr` — matches the frontend default and audit-trail expectations.
 */
export function resolvePdfLocale(req: Request): PdfLocale {
  const queryRaw = req.query?.locale;
  const queryStr = typeof queryRaw === 'string' ? queryRaw : undefined;
  const fromQuery = normalize(queryStr);
  if (fromQuery && VALID.has(fromQuery)) return fromQuery;

  const headerRaw = req.headers['accept-language'];
  const headerStr = typeof headerRaw === 'string' ? headerRaw : undefined;
  const fromHeader = normalize(headerStr);
  if (fromHeader && VALID.has(fromHeader)) return fromHeader;

  return 'fr';
}
