import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

const SESSION_KEY_PREFIX = 'sess:';

interface StoredSession {
  userId?: string;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async destroyAllForUser(userId: string): Promise<void> {
    await this.destroyMatching(userId, null);
  }

  async destroyAllForUserExcept(userId: string, exceptSessionId: string): Promise<void> {
    await this.destroyMatching(userId, exceptSessionId);
  }

  private async destroyMatching(userId: string, exceptSessionId: string | null): Promise<void> {
    const keys = await this.redis.keys(`${SESSION_KEY_PREFIX}*`);
    const toDelete: string[] = [];

    for (const key of keys) {
      const raw = await this.redis.get(key);
      if (this.isSessionToDelete(key, raw, userId, exceptSessionId)) {
        toDelete.push(key);
      }
    }

    if (toDelete.length > 0) {
      await this.redis.del(...toDelete);
      this.logger.log({ event: 'session.destroyed', count: toDelete.length, userId });
    }
  }

  private isSessionToDelete(
    key: string,
    raw: string | null,
    userId: string,
    exceptSessionId: string | null,
  ): boolean {
    if (!raw) {
      return false;
    }
    let parsed: StoredSession;
    try {
      parsed = JSON.parse(raw) as StoredSession;
    } catch {
      this.logger.warn({ event: 'session.key.unparseable', key });
      return false;
    }
    if (parsed.userId !== userId) {
      return false;
    }
    const sid = key.slice(SESSION_KEY_PREFIX.length);
    if (exceptSessionId !== null && sid === exceptSessionId) {
      return false;
    }
    return true;
  }
}
