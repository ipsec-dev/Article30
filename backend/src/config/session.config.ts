import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { Redis } from 'ioredis';
import { RequestHandler } from 'express';
import { Logger } from '@nestjs/common';

const logger = new Logger('Session');

const MIN_SECRET_LENGTH = 32;
const SESSION_DURATION_HOURS = 12;
const SESSION_MAX_AGE_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000;

function validateSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === 'change-me' || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      'SESSION_SECRET must be set to a random string of at least 32 characters. ' +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return secret;
}

function resolveRedisUrl(): string {
  const base = process.env.REDIS_URL || 'redis://localhost:6379';
  const password = process.env.REDIS_PASSWORD;
  if (!password) {
    return base;
  }
  const url = new URL(base);
  if (url.username || url.password) {
    return base;
  }
  url.password = password;
  return url.toString();
}

export function createSessionMiddleware(): RequestHandler {
  const secret = validateSessionSecret();
  const redisClient = new Redis(resolveRedisUrl());

  redisClient.on('connect', () => logger.debug({ event: 'redis.connected' }));
  redisClient.on('error', err => logger.error({ event: 'redis.error', err }));

  return session({
    secret,
    store: new RedisStore({ client: redisClient }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: SESSION_MAX_AGE_MS,
      sameSite: 'lax',
    },
  });
}
