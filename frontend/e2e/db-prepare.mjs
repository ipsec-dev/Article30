#!/usr/bin/env node
// Creates the article30_e2e Postgres database (idempotent) and applies Prisma
// migrations.  Must run before Playwright starts its webServer, because the
// backend crashes immediately when DATABASE_URL points to a missing DB.
// Runs via the `e2e` npm script (see frontend/package.json).

import { execFileSync } from 'node:child_process';

const E2E_DB_URL = 'postgresql://article30:article30_secret@localhost:5432/article30_e2e';
const ADMIN_POSTGRES_URL = 'postgresql://article30:article30_secret@localhost:5432/postgres';

try {
  execFileSync('psql', [ADMIN_POSTGRES_URL, '-c', 'CREATE DATABASE article30_e2e;'], {
    stdio: 'pipe',
  });
  console.log('[e2e] created database article30_e2e');
} catch {
  console.log('[e2e] database article30_e2e already exists');
}

execFileSync('pnpm', ['--filter', '@article30/backend', 'exec', 'prisma', 'migrate', 'deploy'], {
  env: { ...process.env, DATABASE_URL: E2E_DB_URL },
  stdio: 'inherit',
});
