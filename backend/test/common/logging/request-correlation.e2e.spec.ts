import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { buildPinoOptions } from '../../../src/common/logging/pino.config';

// Lines written by pino via the injected destination stream below.
const capturedLines: string[] = [];

describe('request correlation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Force HTTP access-log emission even though globalSetup defaults to silent.
    // buildPinoOptions() reads env at call time, so the override below takes effect.
    process.env.LOG_LEVEL = 'info';
    process.env.LOG_HTTP = 'true';

    // Destination stream that captures every pino line into capturedLines[].
    const destination = {
      write: (chunk: string): true => {
        for (const raw of chunk.split('\n')) {
          if (raw) capturedLines.push(raw);
        }
        return true;
      },
    };

    // nestjs-pino builds its pinoHttp middleware from the params injected under the
    // 'pino-params' token. Overriding that token lets us swap in a capturing
    // destination while keeping every other pino option (redaction, genReqId,
    // customProps echo, etc.) identical to production.
    const options = buildPinoOptions();
    const pinoHttpOptions = options.pinoHttp ?? {};

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider('pino-params')
      .useValue({
        // Array form: [options, destinationStream] — pinoHttp forwards the second arg
        // as the stream so our capturer receives every line the app would normally
        // write to stdout.
        pinoHttp: [pinoHttpOptions, destination],
      })
      .compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(Logger));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('echoes a provided x-request-id header', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/docs-json')
      .set('x-request-id', '01HQVALID12345678901234567');
    expect(res.headers['x-request-id']).toBe('01HQVALID12345678901234567');
  });

  it('generates a new request id when none is provided', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json');
    expect(res.headers['x-request-id']).toMatch(/^[0-9A-Z]{26}$/); // ULID
  });

  it('rejects a request id containing control characters or disallowed chars', async () => {
    // Must be a header-value-legal string (superagent rejects spaces/CTL chars
    // client-side) that still fails the server's /^[A-Za-z0-9_-]+$/ pattern.
    const res = await request(app.getHttpServer())
      .get('/api/docs-json')
      .set('x-request-id', 'bad;value*with!disallowed@chars');
    expect(res.headers['x-request-id']).toMatch(/^[0-9A-Z]{26}$/);
  });

  it('propagates the requestId through the full request pipeline', async () => {
    const before = capturedLines.length;
    const res = await request(app.getHttpServer())
      .get('/api/docs-json')
      .set('x-request-id', '01HQPROP1234567890123456AB');
    const reqId = res.headers['x-request-id'];
    expect(reqId).toBe('01HQPROP1234567890123456AB');
    // Inspect only lines written during this request.
    const fresh = capturedLines.slice(before);
    const hit = fresh.some(raw => {
      try {
        const parsed = JSON.parse(raw) as { requestId?: string; req?: { requestId?: string } };
        return parsed.requestId === reqId || parsed.req?.requestId === reqId;
      } catch {
        return false;
      }
    });
    expect(hit).toBe(true);
  });
});
