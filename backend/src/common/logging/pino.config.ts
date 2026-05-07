import type { Params } from 'nestjs-pino';
import { ulid } from 'ulid';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ClsServiceManager } from 'nestjs-cls';
import { CENSOR_PATHS, STRIP_PATHS, isStripPath } from './redact-paths';

const REQ_ID_MAX_LEN = 128;
const REQ_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_SERVER_ERROR_MIN = 500;

function resolveLogLevel(): string {
  const explicit = process.env.LOG_LEVEL;
  if (explicit && explicit.length > 0) {
    return explicit;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'debug';
  }
  return 'info';
}

function resolvePretty(): boolean {
  if (process.env.LOG_PRETTY === 'true') {
    return true;
  }
  if (process.env.LOG_PRETTY === 'false') {
    return false;
  }
  return process.env.NODE_ENV === 'development';
}

function firstHeaderValue(header: string | string[] | undefined): string | undefined {
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
}

function buildPrettyTransport() {
  return {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: true,
      messageKey: 'event',
    },
  };
}

function buildAutoLogging(httpEnabled: boolean) {
  if (!httpEnabled) {
    return false as const;
  }
  return {
    ignore: (req: IncomingMessage) => {
      const url = req.url ?? '';
      if (url === '/health' || url === '/favicon.ico') {
        return true;
      }
      return false;
    },
  };
}

function genReqId(req: IncomingMessage): string {
  const header = req.headers['x-request-id'];
  const candidate = firstHeaderValue(header);
  if (
    typeof candidate === 'string' &&
    candidate.length > 0 &&
    candidate.length <= REQ_ID_MAX_LEN &&
    REQ_ID_PATTERN.test(candidate)
  ) {
    return candidate;
  }
  return ulid();
}

/**
 * Pino options used by both the Nest LoggerService and the pino-http middleware.
 * Single source of truth — all other modules consume this.
 */
export function buildPinoOptions(): Params {
  const level = resolveLogLevel();
  const pretty = resolvePretty();
  const httpEnabled = process.env.LOG_HTTP !== 'false';
  let transport: ReturnType<typeof buildPrettyTransport> | undefined;
  if (pretty) {
    transport = buildPrettyTransport();
  }

  return {
    pinoHttp: {
      level,
      genReqId,
      transport,
      customSuccessMessage: () => 'http.request.completed',
      customErrorMessage: () => 'http.request.failed',
      customSuccessObject: (_req: IncomingMessage, _res: ServerResponse, val: object) => ({
        ...(val as Record<string, unknown>),
        event: 'http.request.completed',
      }),
      customErrorObject: (
        _req: IncomingMessage,
        _res: ServerResponse,
        _err: Error,
        val: object,
      ) => ({
        ...(val as Record<string, unknown>),
        event: 'http.request.failed',
      }),
      customAttributeKeys: {
        req: 'req',
        res: 'res',
        err: 'err',
        responseTime: 'responseTimeMs',
        reqId: 'requestId',
      },
      autoLogging: buildAutoLogging(httpEnabled),
      customLogLevel: (req: IncomingMessage, res: ServerResponse, err?: Error) => {
        if (err || res.statusCode >= HTTP_SERVER_ERROR_MIN) {
          return 'error';
        }
        if (res.statusCode >= HTTP_CLIENT_ERROR_MIN) {
          return 'warn';
        }
        if (req.method === 'GET' && res.statusCode < HTTP_CLIENT_ERROR_MIN) {
          return 'debug';
        }
        return 'info';
      },
      formatters: {
        level: (label: string) => ({ level: label }),
      },
      mixin: () => {
        const cls = ClsServiceManager.getClsService();
        if (!cls.isActive()) {
          return {};
        }
        const jobId = cls.get<string | undefined>('jobId');
        const jobName = cls.get<string | undefined>('jobName');
        if (jobId && jobName) {
          return { jobId, jobName };
        }
        return {};
      },
      redact: {
        paths: [...STRIP_PATHS, ...CENSOR_PATHS],
        censor: (_value: unknown, path: readonly string[]) => {
          if (isStripPath(path)) {
            return undefined;
          }
          return '[Redacted]';
        },
        remove: false,
      },
      serializers: {
        // Keep headers + ip so redact can strip/censor them.
        // Skip request/response bodies — those are large, noisy, and redact's
        // wildcard depth won't reliably catch every nested secret.
        req: (req: {
          method?: string;
          url?: string;
          id?: string;
          headers?: Record<string, unknown>;
          ip?: string;
          remoteAddress?: string;
        }) => ({
          method: req.method,
          url: req.url,
          requestId: req.id,
          headers: req.headers,
          ip: req.ip,
          remoteAddress: req.remoteAddress,
        }),
        res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
      },
      // Echo the request id back to the client.
      // pino-http invokes customProps twice per request: once pre-flush (when we
      // want to setHeader) and once post-flush in onResFinished (when headers
      // are already sent). The headersSent guard turns the late call into a no-op.
      customProps: (req, res) => {
        const typedReq = req as IncomingMessage & { id?: string | number };
        if (!res.headersSent && typedReq.id !== undefined && typedReq.id !== null) {
          res.setHeader('x-request-id', String(typedReq.id));
        }
        return {};
      },
    },
  };
}
