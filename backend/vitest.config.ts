import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['test/**/*.spec.ts'],
    globalSetup: ['test/setup.ts'],
    setupFiles: ['test/silence-logger.ts'],
    globals: true,
    testTimeout: 15000,
    hookTimeout: 30000,
    // Test files share a single PostgreSQL test DB — run them serially to avoid
    // cross-file data contamination from concurrent cleanupDatabase() calls.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      // Surface un-imported source files so coverage gaps are visible,
      // not hidden behind "no test ever imported this module".
      // (Vitest 4.1.5+ infers `all` from `include`/`exclude` — the explicit
      // `all: true` was removed from CoverageOptions and now fails typecheck.)
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/**/*.d.ts',
        'src/**/*.interface.ts',
        'src/prisma/**',
        'src/types/**',
        'src/config/session.config.ts',
      ],
      thresholds: {
        statements: 87,
        branches: 75,
        functions: 94,
        lines: 87,
      },
    },
  },
});
