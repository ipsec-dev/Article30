import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { chromium, type FullConfig } from '@playwright/test';
import bcrypt from 'bcrypt';

// DB creation + migrations happen in e2e/db-prepare.mjs (run by the `e2e` npm
// script before Playwright starts its webServer).  This hook resets data,
// seeds the admin, and persists an authenticated session so individual tests
// reuse the cookie via `storageState` instead of hammering /auth/login (which
// would trip the 5-attempts-per-minute rate limit).
const E2E_DB_URL = 'postgresql://article30:article30_secret@localhost:5432/article30_e2e';
const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASSWORD = 'Admin-Passw0rd!';
export const ADMIN_STORAGE_STATE = 'e2e/.admin-storage-state.json';

async function globalSetup(config: FullConfig) {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: E2E_DB_URL }) });
  try {
    // Models dropped during the single-tenant migration are no longer in the
    // delete chain: DsrTreatment (Phase C migration), Membership (org-system
    // removal). Cascade FKs handle the orphaned per-DSR sub-tables.
    await prisma.$transaction([
      prisma.regulatoryUpdate.deleteMany(),
      prisma.rssFeed.deleteMany(),
      prisma.vendorAssessment.deleteMany(),
      prisma.vendorTreatment.deleteMany(),
      prisma.vendor.deleteMany(),
      prisma.dataSubjectRequest.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.checklistResponse.deleteMany(),
      prisma.complianceSnapshot.deleteMany(),
      prisma.violationTreatment.deleteMany(),
      prisma.violation.deleteMany(),
      prisma.screening.deleteMany(),
      prisma.treatment.deleteMany(),
      prisma.organization.deleteMany(),
      prisma.document.deleteMany(),
      prisma.passwordResetToken.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    await prisma.organization.create({
      data: { slug: 'e2e-default', locale: 'fr' },
    });

    await prisma.user.create({
      data: {
        firstName: 'E2E',
        lastName: 'Admin',
        email: ADMIN_EMAIL,
        password: await bcrypt.hash(ADMIN_PASSWORD, 4),
        role: 'ADMIN',
        approved: true,
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  // Log in once, persist storage state for the session-based fixture below.
  // Wait for the frontend to be ready (Playwright's webServer guarantees the
  // backend is up before globalSetup runs, but the frontend may still be
  // booting up since it's the second webServer).
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto('/login');
  // Prime the XSRF cookie before the login POST.
  await page.evaluate(async () => {
    await fetch('/api/auth/me', { credentials: 'include' }).catch(() => {});
  });
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/mot de passe|password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /se connecter|sign in|login/i }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 60_000 });
  await context.storageState({ path: ADMIN_STORAGE_STATE });
  await browser.close();
}

export default globalSetup;
