import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createSessionMiddleware } from './config/session.config';
import { csrfMiddleware } from './common/middleware/csrf.middleware';

const APP_PORT = 3001;
const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';
const HSTS_MAX_AGE = 31536000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useLogger(app.get(Logger));
  app.flushLogs();

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      strictTransportSecurity: {
        maxAge: HSTS_MAX_AGE,
        includeSubDomains: true,
      },
    }),
  );

  app.use(cookieParser());
  app.use(createSessionMiddleware());
  app.use(csrfMiddleware);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const corsOrigin = process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const log = app.get(Logger);

  if (process.env.NODE_ENV === 'development') {
    const config = new DocumentBuilder().setTitle('Article30 API').setVersion('1.0').build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    log.log({
      event: 'bootstrap.swagger.ready',
      url: `http://localhost:${APP_PORT}/api/docs`,
    });
  }

  app.enableShutdownHooks();

  await app.listen(APP_PORT);

  log.log({
    event: 'bootstrap.listening',
    port: APP_PORT,
    nodeEnv: process.env.NODE_ENV ?? null,
    corsOrigin,
  });

  // Graceful shutdown so pnpm doesn't surface `ELIFECYCLE Command failed`
  // when dev.sh / Docker signals the process group on Ctrl-C.
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, async () => {
      log.log({ event: 'bootstrap.shutdown', signal });
      await app.close();
      process.exit(0);
    });
  }
}
bootstrap();
