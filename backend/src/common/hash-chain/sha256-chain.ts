import { createHash } from 'node:crypto';

/**
 * SHA-256 of the given input, returned as lowercase hexadecimal.
 *
 * Accepts string (UTF-8) or Buffer. Suitable for tamper-evident hashing
 * of binary content (file uploads) or pre-canonicalised text.
 */
export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Returns the next link in a hash chain.
 *
 * @param previousHash hex digest of the prior row, or null/undefined for the first link.
 *                     An empty string is treated as "no previous link" (same as null).
 * @param payload      the current row's content. Buffer payloads are always safe;
 *                     string payloads must have a deterministic byte representation
 *                     (sorted-key JSON or a fixed schema) — insertion-order
 *                     differences in JSON.stringify() will produce different hashes.
 */
export function chainNext(
  previousHash: string | null | undefined,
  payload: string | Buffer,
): string {
  const prev = previousHash ?? '';
  const buf = Buffer.concat([
    Buffer.from(prev, 'utf8'),
    Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8'),
  ]);
  return sha256Hex(buf);
}
