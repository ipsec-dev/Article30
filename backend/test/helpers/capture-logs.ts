import pino from 'pino';
import { buildPinoOptions } from '../../src/common/logging/pino.config';

export interface CapturedLog extends Record<string, unknown> {
  level: string;
  event?: string;
  msg?: string;
}

export function captureLogs(): { logger: pino.Logger; lines: CapturedLog[] } {
  const lines: CapturedLog[] = [];
  const destination = {
    write: (chunk: string): true => {
      for (const raw of chunk.split('\n')) {
        if (!raw) continue;
        lines.push(JSON.parse(raw) as CapturedLog);
      }
      return true;
    },
  };
  const options = buildPinoOptions().pinoHttp ?? {};
  const { transport: _transport, ...base } = options as Record<string, unknown>;
  const logger = pino(
    { ...base, level: 'trace' },
    destination as unknown as pino.DestinationStream,
  );
  return { logger, lines };
}
