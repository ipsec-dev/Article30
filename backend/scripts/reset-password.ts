/* eslint-disable no-console */
/**
 * Paved-road recovery CLI for the sole-admin-lost-password case.
 *
 *   pnpm --filter backend password:reset --email <addr>
 *   pnpm --filter backend password:reset --email <addr> --password "<new>"
 *
 * Token mode (default) prints a one-time reset URL and exits. Direct mode
 * sets the password inline, destroys every session for that user, and
 * exits. Both modes work identically whether SMTP is enabled or not —
 * recovery does not depend on mail.
 */

import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import Redis from 'ioredis';
import { validatePasswordPolicy } from '../src/modules/auth/password-policy';
import { PasswordResetTokenService } from '../src/modules/auth/password-reset-token.service';

const BCRYPT_SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MINUTES = 60;

export interface ResetPasswordArgs {
  email: string;
  /** When present, switches to direct mode. */
  password?: string;
}

export interface MinimalSessionService {
  destroyAllForUser(userId: string): Promise<void>;
}

export interface MinimalLogger {
  info: (obj: Record<string, unknown>) => void;
  warn: (obj: Record<string, unknown>) => void;
  error: (obj: Record<string, unknown>) => void;
}

export interface ResetPasswordDeps {
  prisma: Pick<PrismaClient, 'user'>;
  tokenService: Pick<PasswordResetTokenService, 'generate'>;
  sessionService: MinimalSessionService;
  frontendUrl: string;
  logger: MinimalLogger;
  bcryptSaltRounds: number;
}

export type ResetPasswordResult =
  | { ok: true; mode: 'token'; resetUrl: string; expiresInMinutes: number }
  | { ok: true; mode: 'direct'; userId: string }
  | { ok: false; reason: 'not_found' | 'weak_password'; message: string };

export async function resetPassword(
  args: ResetPasswordArgs,
  deps: ResetPasswordDeps,
): Promise<ResetPasswordResult> {
  const user = await deps.prisma.user.findUnique({ where: { email: args.email } });
  if (!user) {
    return { ok: false, reason: 'not_found', message: `No user with email ${args.email}` };
  }

  if (args.password !== undefined) {
    const policy = validatePasswordPolicy(args.password);
    if (!policy.ok) {
      return { ok: false, reason: 'weak_password', message: policy.message };
    }
    const hashed = await bcrypt.hash(args.password, deps.bcryptSaltRounds);
    await deps.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    await deps.sessionService.destroyAllForUser(user.id);
    deps.logger.info({
      event: 'auth.password.cli_reset',
      userId: user.id,
      mode: 'direct',
      origin: 'cli',
    });
    return { ok: true, mode: 'direct', userId: user.id };
  }

  const token = await deps.tokenService.generate(user.id);
  const resetUrl = `${deps.frontendUrl}/reset-password?token=${token}`;
  deps.logger.info({
    event: 'auth.password.cli_reset',
    userId: user.id,
    mode: 'token',
    origin: 'cli',
  });
  return { ok: true, mode: 'token', resetUrl, expiresInMinutes: RESET_TOKEN_TTL_MINUTES };
}

export function parseArgs(argv: string[]): ResetPasswordArgs | { error: string } {
  const args: Partial<ResetPasswordArgs> = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--email') {
      if (value === undefined || value.startsWith('--')) {
        return { error: '--email requires a value' };
      }
      args.email = value;
      i++;
    } else if (flag === '--password') {
      if (value === undefined || value.startsWith('--')) {
        return { error: '--password requires a value' };
      }
      args.password = value;
      i++;
    } else {
      return { error: `unknown flag ${flag}` };
    }
  }
  if (!args.email) return { error: 'missing --email' };
  return args as ResetPasswordArgs;
}

async function destroySessionsForUser(redis: Redis, userId: string): Promise<void> {
  const keys = await redis.keys('sess:*');
  if (keys.length === 0) return;
  const raws = await redis.mget(...keys);
  const toDelete: string[] = [];
  raws.forEach((raw, idx) => {
    if (typeof raw !== 'string') return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.userId === userId) {
        toDelete.push(keys[idx]);
      }
    } catch {
      // ignore malformed sessions
    }
  });
  if (toDelete.length > 0) await redis.del(...toDelete);
}

function resolveRedisUrl(): string {
  const base = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const password = process.env.REDIS_PASSWORD;
  if (!password) return base;
  const parsed = new URL(base);
  if (parsed.username || parsed.password) return base;
  parsed.password = password;
  return parsed.toString();
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if ('error' in parsed) {
    console.error(`reset-password: ${parsed.error}`);
    console.error('Usage: pnpm --filter backend password:reset --email <addr> [--password <new>]');
    process.exit(2);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const redis = new Redis(resolveRedisUrl());
  const tokenService = new PasswordResetTokenService(prisma as unknown as never);
  const sessionService: MinimalSessionService = {
    destroyAllForUser: userId => destroySessionsForUser(redis, userId),
  };

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const logger: MinimalLogger = {
    info: o => console.log(JSON.stringify({ level: 'info', ...o })),
    warn: o => console.warn(JSON.stringify({ level: 'warn', ...o })),
    error: o => console.error(JSON.stringify({ level: 'error', ...o })),
  };

  try {
    const result = await resetPassword(parsed, {
      prisma,
      tokenService,
      sessionService,
      frontendUrl,
      logger,
      bcryptSaltRounds: BCRYPT_SALT_ROUNDS,
    });
    if (!result.ok) {
      console.error(`reset-password: ${result.message}`);
      process.exit(result.reason === 'not_found' ? 3 : 4);
    }
    if (result.mode === 'token') {
      console.log('Reset URL (share out-of-band with the user):');
      console.log(result.resetUrl);
      console.log(`Expires in ${result.expiresInMinutes} minutes.`);
    } else {
      console.log(`Password updated for user ${result.userId}. All sessions destroyed.`);
    }
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('reset-password: unexpected error', err);
    process.exit(1);
  });
}
