// Runs once per vitest worker process (via `setupFiles` in vitest.config.ts).
// Disables @nestjs/common's classic Logger so tests that build a Nest module
// without calling app.useLogger(pino) don't emit stray stdout lines.
// Env-driven pino output is silenced separately via LOG_LEVEL=silent in globalSetup.
import { Logger } from '@nestjs/common';

// Force every test worker onto the test DB. Some specs forget to override
// DATABASE_URL before compiling their Nest module, and on CI the default
// `article30` DB has no migrations applied — so PrismaService would connect
// to an empty DB and tests fail with "table does not exist". Locally this
// went unnoticed because dev runs migrations on `article30` too.
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR — test-only default

Logger.overrideLogger(false);
