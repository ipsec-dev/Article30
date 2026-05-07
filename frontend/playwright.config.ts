import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /\.e2e\.ts$/,
  // Per-test default timeout: bumped to 60s so first-route-compile latency
  // (Next.js dev compiles each route on first navigation) doesn't flake the
  // smoke suite.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  // Retry on dev-compile flakes; later attempts hit a warm route.
  retries: 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  webServer: [
    {
      command: 'pnpm --filter @article30/backend dev',
      url: 'http://localhost:3001/api/recitals?page=1&limit=1',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        DATABASE_URL: 'postgresql://article30:article30_secret@localhost:5432/article30_e2e',
        REDIS_URL: 'redis://localhost:6379',
        REDIS_PASSWORD: 'article30_redis_dev',
        AUDIT_HMAC_SECRET: 'e2e-audit-secret',
        SESSION_SECRET: 'e2e-session-secret-32-bytes-minimum-length-filler',
        NODE_ENV: 'development',
        SMTP_FROM: 'noreply@e2e.test',
        FRONTEND_URL: 'http://localhost:3000',
      },
    },
    {
      command: 'pnpm --filter @article30/frontend dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
