import { createHash } from 'node:crypto';

const EMAIL_HASH_LENGTH = 10;

/**
 * Correlatable-but-low-entropy representation of an email for logs.
 * 10 hex chars (40 bits) = enough to join log lines within a short retention window,
 * low enough that these hashes are not a long-term identifier. NOT a privacy barrier
 * against an attacker with log access and a candidate email list.
 */
export function emailHash(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHash('sha256').update(normalized).digest('hex').slice(0, EMAIL_HASH_LENGTH);
}
