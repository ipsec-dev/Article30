import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Redis from 'ioredis';
import { SessionService } from '../../src/modules/auth/session.service';

describe('SessionService', () => {
  let redis: Redis;
  let service: SessionService;

  beforeAll(() => {
    const baseUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const password = process.env.REDIS_PASSWORD;
    const resolvedUrl = (() => {
      if (!password) return baseUrl;
      const parsed = new URL(baseUrl);
      if (parsed.username || parsed.password) return baseUrl;
      parsed.password = password;
      return parsed.toString();
    })();
    redis = new Redis(resolvedUrl);
    service = new SessionService(redis);
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    const keys = await redis.keys('sess:*');
    if (keys.length > 0) await redis.del(...keys);
  });

  async function seedSession(sessionId: string, userId: string): Promise<void> {
    await redis.set(`sess:${sessionId}`, JSON.stringify({ userId, cookie: {} }));
  }

  it('destroyAllForUser deletes every session whose userId matches', async () => {
    await seedSession('s1', 'user-A');
    await seedSession('s2', 'user-A');
    await seedSession('s3', 'user-B');

    await service.destroyAllForUser('user-A');

    expect(await redis.exists('sess:s1')).toBe(0);
    expect(await redis.exists('sess:s2')).toBe(0);
    expect(await redis.exists('sess:s3')).toBe(1);
  });

  it('destroyAllForUserExcept keeps the specified session', async () => {
    await seedSession('s1', 'user-A');
    await seedSession('s2', 'user-A');
    await seedSession('s3', 'user-A');

    await service.destroyAllForUserExcept('user-A', 's2');

    expect(await redis.exists('sess:s1')).toBe(0);
    expect(await redis.exists('sess:s2')).toBe(1);
    expect(await redis.exists('sess:s3')).toBe(0);
  });

  it('destroyAllForUser tolerates sessions with unparseable bodies', async () => {
    await redis.set('sess:junk', 'not json');
    await seedSession('s1', 'user-A');
    await service.destroyAllForUser('user-A');
    expect(await redis.exists('sess:s1')).toBe(0);
    expect(await redis.exists('sess:junk')).toBe(1);
  });
});
