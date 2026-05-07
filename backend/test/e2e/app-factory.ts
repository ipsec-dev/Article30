import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { csrfMiddleware } from '../../src/common/middleware/csrf.middleware';
import { createSessionMiddleware } from '../../src/config/session.config';
import { REDIS_CLIENT } from '../../src/modules/auth/session.service';
import { StorageService } from '../../src/modules/documents/storage.service';
import { MailService, type MailSink } from '../../src/modules/mail/mail.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test';
const TEST_REDIS_BASE_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

function resolveRedisUrl(): string {
  const password = process.env.REDIS_PASSWORD;
  if (!password) return TEST_REDIS_BASE_URL;
  const parsed = new URL(TEST_REDIS_BASE_URL);
  if (parsed.username || parsed.password) return TEST_REDIS_BASE_URL;
  parsed.password = password;
  return parsed.toString();
}

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  redis: Redis;
  mailSink: MailSink;
  /** Bare agent — no session. Use loginAs() to authenticate. */
  agent: () => ReturnType<typeof request>;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  process.env.DATABASE_URL = TEST_DB_URL;
  process.env.NODE_ENV = 'test';
  process.env.SMTP_FROM ??= 'test@example.local';
  process.env.SMTP_ENABLED ??= 'true';
  // Hard override (not `??=`): `.env.dev` symlinked to `backend/.env` may have
  // already set FRONTEND_URL=http://localhost:3000 via dotenv/config in
  // test/setup.ts. e2e tests assert against this value so force the canonical
  // test origin regardless of local dotenv.
  process.env.FRONTEND_URL = 'https://app.test';
  process.env.SESSION_SECRET ??= 'ci-only-session-secret-not-for-production';
  process.env.AUDIT_HMAC_SECRET ??= 'ci-only-audit-secret-not-for-production';

  const redis = new Redis(resolveRedisUrl());
  const mailSink: MailSink = [];

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(REDIS_CLIENT)
    .useValue(redis)
    .overrideProvider(MailService)
    .useFactory({
      factory: () => {
        const transport = nodemailer.createTransport({ jsonTransport: true });
        const svc = new MailService();
        svc.setTransportForTesting(transport as unknown as nodemailer.Transporter, mailSink);
        return svc;
      },
    })
    .overrideProvider(StorageService)
    .useValue({
      onModuleInit: async () => {},
      upload: async (_key: string, _buffer: Buffer, _mimeType: string) => {},
      getPresignedUrl: async (_key: string) => 'https://test.local/signed',
      delete: async (_key: string) => {},
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.use(createSessionMiddleware());
  app.use(csrfMiddleware);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const prisma = moduleRef.get(PrismaService);

  return {
    app,
    prisma,
    redis,
    mailSink,
    agent: () => request(app.getHttpServer()),
    close: async () => {
      await app.close();
      await redis.quit();
    },
  };
}
