// Make @testing-library/jest-dom's matcher augmentation visible to tsc.
// Runtime augmentation happens via the import in frontend/test/setup.ts;
// this .d.ts mirrors it so tsc --noEmit also sees toBeInTheDocument etc.
//
// We inline the augmentation instead of re-exporting jest-dom's
// `@testing-library/jest-dom/vitest` because that file resolves `vitest` from
// inside jest-dom's own package directory, which under pnpm may resolve to a
// different vitest copy than the one frontend test files consume — leaving
// their `Assertion<HTMLElement>` untouched. Resolving `vitest` from here
// (frontend/types/) pins the augmentation to frontend's actual vitest dep.
import 'vitest';
import { type TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  interface Assertion<T = unknown> extends TestingLibraryMatchers<unknown, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}
