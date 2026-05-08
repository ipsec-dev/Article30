import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PRISMA_SELECT } from '../../common/prisma/select-shapes';

const GENESIS = 'GENESIS';
const DEFAULT_PAGE_SIZE = 20;

// Serializable audit-log writes conflict under concurrent traffic. Postgres
// aborts the loser with error code P2034 (Prisma serialization failure). These
// are transient — retry a handful of times with a small linear backoff before
// surfacing to the caller.
const SERIALIZATION_FAILURE_CODE = 'P2034';
const MAX_WRITE_ATTEMPTS = 4;
const RETRY_BACKOFF_MS = 10;

function isSerializationFailure(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === SERIALIZATION_FAILURE_CODE
  );
}

// Keyed HMAC so a DB-level attacker cannot silently recompute the chain
// after tampering. The secret lives in the environment, not the DB.
function auditHmac(input: string): string {
  const secret = process.env.AUDIT_HMAC_SECRET;
  if (!secret) {
    throw new InternalServerErrorException(
      'AUDIT_HMAC_SECRET is not set — refusing to write an unprotected audit log entry',
    );
  }
  return createHmac('sha256', secret).update(input).digest('hex');
}

// Prisma returns BigInt for fields like Organization.annualTurnover, but
// JSON.stringify() cannot serialize BigInt and Postgres JSONB cannot store
// it either. Coerce BigInt to its decimal string form before hashing and
// persistence; verify() then re-hashes the stored string and matches.
function toJsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(toJsonSafe);
  }
  if (value !== null && typeof value === 'object' && value.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = toJsonSafe(v);
    }
    return result;
  }
  return value;
}

// Postgres JSONB does not preserve key order, so JSON.stringify() produces
// non-deterministic output after a round-trip and breaks the HMAC chain on
// verify(). Sort keys recursively before stringifying.
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const sorted = Object.keys(record).sort((a, b) => a.localeCompare(b));
  const entries = sorted.map(k => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(',');
  return `{${entries}}`;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = DEFAULT_PAGE_SIZE, entity?: string) {
    let where = {};
    if (entity) {
      where = { entity };
    }
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { performedAt: 'desc' },
        include: { performer: { select: PRISMA_SELECT.userRef } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async create(params: {
    action: string;
    entity: string;
    entityId: string;
    oldValue?: Prisma.InputJsonValue | null;
    newValue?: Prisma.InputJsonValue | null;
    performedBy: string | null; // null for public @Public() events
  }) {
    // Normalize BigInt and other non-JSON values once, then use the same
    // sanitized payload for both the hash input and the JSONB column so
    // verify() can rebuild the same hash from what is stored.
    const oldValueSafe = toJsonSafe(params.oldValue ?? null) as Prisma.InputJsonValue | null;
    const newValueSafe = toJsonSafe(params.newValue ?? null) as Prisma.InputJsonValue | null;

    // Serializable isolation: two concurrent writes must not both observe
    // the same "latest hash" and fork the chain. Postgres aborts one of
    // the conflicting transactions with P2034; we retry those transparently.
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(
          async tx => {
            const latest = await tx.auditLog.findFirst({
              orderBy: { performedAt: 'desc' },
              select: { hash: true },
            });

            const previousHash = latest?.hash || null;
            const performedAt = new Date();

            const hashInput = [
              previousHash ?? GENESIS,
              params.action,
              params.entity,
              params.entityId,
              stableStringify(oldValueSafe),
              stableStringify(newValueSafe),
              params.performedBy,
              performedAt.toISOString(),
            ].join('|');

            const hash = auditHmac(hashInput);

            return tx.auditLog.create({
              data: {
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                performedBy: params.performedBy,
                oldValue: oldValueSafe ?? Prisma.JsonNull,
                newValue: newValueSafe ?? Prisma.JsonNull,
                hash,
                previousHash,
                performedAt,
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (err) {
        lastError = err;
        if (!isSerializationFailure(err) || attempt === MAX_WRITE_ATTEMPTS) {
          throw err;
        }
        this.logger.debug({
          event: 'audit.write.retrying',
          maxAttempts: MAX_WRITE_ATTEMPTS,
          attempt,
        });
        await delay(RETRY_BACKOFF_MS * attempt);
      }
    }
    // Unreachable: the loop either returns or throws.
    throw lastError;
  }

  async verify(): Promise<{
    valid: boolean;
    totalRows: number;
    checkedAt: string;
    brokenAt?: { id: string; performedAt: Date };
  }> {
    const entries = await this.prisma.auditLog.findMany({
      orderBy: { performedAt: 'asc' },
    });

    const checkedAt = new Date().toISOString();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      let expectedPreviousHash: string | null = null;
      if (i !== 0) {
        expectedPreviousHash = entries[i - 1].hash;
      }

      const hashInput = [
        expectedPreviousHash ?? GENESIS,
        entry.action,
        entry.entity,
        entry.entityId,
        stableStringify(entry.oldValue ?? null),
        stableStringify(entry.newValue ?? null),
        entry.performedBy,
        entry.performedAt.toISOString(),
      ].join('|');

      const expectedHash = auditHmac(hashInput);

      if (entry.hash !== expectedHash || entry.previousHash !== expectedPreviousHash) {
        return {
          valid: false,
          brokenAt: { id: entry.id, performedAt: entry.performedAt },
          totalRows: entries.length,
          checkedAt,
        };
      }
    }

    return { valid: true, totalRows: entries.length, checkedAt };
  }
}
