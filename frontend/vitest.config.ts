import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.spec.{ts,tsx}'],
    // v8 coverage instrumentation slows down @testing-library/user-event
    // flows past the 5s default — give react-testing-library tests headroom
    // so they don't flake under parallel execution + coverage.
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/app/**',
        'src/middleware.ts',
        'src/**/*.d.ts',
        'src/**/*.stories.{ts,tsx}',
        'src/**/index.ts',
        'src/lib/api/generated/**',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 75,
        lines: 80,
      },
    },
  },
});
