import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

function lockKey(...parts: string[]): bigint {
  const hash = createHash('sha256').update(parts.join('\x00')).digest();
  return hash.readBigInt64BE(0);
}

export async function acquireXactLock(tx: TxClient, ...parts: string[]): Promise<void> {
  const key = lockKey(...parts);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${key})`;
}
