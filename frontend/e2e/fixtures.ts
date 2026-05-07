import { test as base, expect, type Page } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './global-setup';

type Fixtures = {
  loginAsAdmin: Page;
};

export const test = base.extend<Fixtures>({
  // Reuses the admin session captured once during global-setup. Avoids
  // re-logging-in per test (which trips the 5-attempts-per-minute rate limit
  // on /api/auth/login) and saves ~1s of form interaction per test.
  loginAsAdmin: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: ADMIN_STORAGE_STATE });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
