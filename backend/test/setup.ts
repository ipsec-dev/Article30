import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import 'dotenv/config';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const POSTGRES_ADMIN_URL =
  process.env.POSTGRES_ADMIN_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/postgres'; // NOSONAR

const BACKEND_ROOT = resolve(__dirname, '..');

function createDatabaseIfMissing(): void {
  try {
    execFileSync('psql', [POSTGRES_ADMIN_URL, '-c', 'CREATE DATABASE article30_test;'], {
      stdio: 'pipe',
    });
  } catch {
    // Already exists — fine
  }
}

function runMigrateDeploy(): void {
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: BACKEND_ROOT,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'pipe',
  });
}

function dropAndRecreateDatabase(): void {
  // WITH (FORCE) requires Postgres 13+. It terminates existing connections so
  // stale Prisma engine clients from a previous run don't block the drop.
  execFileSync(
    'psql',
    [POSTGRES_ADMIN_URL, '-c', 'DROP DATABASE IF EXISTS article30_test WITH (FORCE);'],
    { stdio: 'pipe' },
  );
  execFileSync('psql', [POSTGRES_ADMIN_URL, '-c', 'CREATE DATABASE article30_test;'], {
    stdio: 'pipe',
  });
}

export async function setup() {
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';
  process.env.LOG_HTTP = process.env.LOG_HTTP ?? 'false';
  process.env.LOG_PRETTY = 'false';

  createDatabaseIfMissing();

  // If migrate deploy fails, the test DB likely has stale schema from a prior
  // migration history (common after a migration squash). Drop once and retry;
  // if it still fails, the underlying error is real — re-throw.
  try {
    runMigrateDeploy();
  } catch {
    dropAndRecreateDatabase();
    runMigrateDeploy();
  }
}

export async function teardown() {
  // DB persists for faster re-runs
}
