// Pino's redact wildcards (`*`) match exactly one level. Deeply-nested fields
// need explicit depth entries — we cover up to 2 levels of nesting, which
// handles realistic "someone logged a DTO that wraps a Prisma entity" cases.
// Deeper nesting is considered a call-site convention violation — T12–T17's
// structured { event, ...fields } pattern keeps logs flat.

export const STRIP_PATHS = [
  'password',
  '*.password',
  '*.*.password',
  'passwordHash',
  '*.passwordHash',
  '*.*.passwordHash',
  'resetToken',
  '*.resetToken',
  '*.*.resetToken',
  'sessionSecret',
  '*.sessionSecret',
  '*.*.sessionSecret',
  'req.headers.authorization',
  'req.headers.cookie',
] as const;

export const CENSOR_PATHS = [
  'email',
  '*.email',
  '*.*.email',
  'phone',
  '*.phone',
  '*.*.phone',
  'remoteAddress',
  '*.remoteAddress',
  'ip',
  '*.ip',
  'req.headers["x-forwarded-for"]',
] as const;

const STRIP_LEAF_KEYS = new Set<string>([
  'password',
  'passwordHash',
  'resetToken',
  'sessionSecret',
]);

const STRIP_HEADER_KEYS = new Set<string>(['authorization', 'cookie']);

/**
 * Decide whether a pino-matched path came from STRIP_PATHS (should be removed)
 * vs CENSOR_PATHS (should be replaced with '[Redacted]').
 *
 * Called by the pino `redact.censor` function at serialization time.
 */
const HEADER_PATH_MIN_LENGTH = 3;

export function isStripPath(path: readonly string[]): boolean {
  if (path.length === 0) {
    return false;
  }
  const leaf = path.at(-1);
  if (leaf === undefined) {
    return false;
  }
  if (STRIP_LEAF_KEYS.has(leaf)) {
    return true;
  }
  // req.headers.authorization / req.headers.cookie
  if (
    path.length >= HEADER_PATH_MIN_LENGTH &&
    path[0] === 'req' &&
    path[1] === 'headers' &&
    STRIP_HEADER_KEYS.has(leaf)
  ) {
    return true;
  }
  return false;
}
