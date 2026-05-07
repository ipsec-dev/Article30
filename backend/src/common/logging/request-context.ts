import { ClsServiceManager } from 'nestjs-cls';
import { ulid } from 'ulid';

/**
 * Run `fn` inside a CLS scope with `jobId` and `jobName` set. The pino `mixin`
 * in `pino.config.ts` reads these back on every log call, so every log line
 * emitted inside `fn` auto-carries them.
 *
 * If `jobId` is not provided a ULID is generated.
 */
export async function runWithJobContext<T>(
  ctx: { jobName: string; jobId?: string },
  fn: () => Promise<T>,
): Promise<T> {
  const cls = ClsServiceManager.getClsService();
  return cls.run(async () => {
    cls.set('jobName', ctx.jobName);
    cls.set('jobId', ctx.jobId ?? ulid());
    return fn();
  });
}
