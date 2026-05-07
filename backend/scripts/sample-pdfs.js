/* eslint-disable */
/**
 * Generates one of each PDF type to <repo-root>/samples/pdfs/ for visual
 * inspection. Audit-package zips are also unpacked into per-locale subfolders
 * so every PDF is browsable in one place without extracting manually.
 *
 * Run from backend/ after `pnpm build`:
 *   node scripts/sample-pdfs.js
 *
 * Output is gitignored (see repo-root .gitignore: `samples/`).
 */
const { writeFileSync, mkdirSync, rmSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { PdfExportService } = require('../dist/src/modules/treatments/pdf-export.service');
const { ScreeningsPdfService } = require('../dist/src/modules/screenings/screenings-pdf.service');
const {
  VendorQuestionnairePdfService,
} = require('../dist/src/modules/vendors/vendor-questionnaire-pdf.service');
const { ReportService } = require('../dist/src/modules/compliance/report.service');
const { AuditPackageService } = require('../dist/src/modules/compliance/audit-package.service');
const { PrismaService } = require('../dist/src/prisma/prisma.service');

const OUT_DIR = resolve(__dirname, '../..', 'samples/pdfs');
const out = name => join(OUT_DIR, name);

async function main() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);

  const treatment = await prisma.treatment.findFirst();
  const screening = await prisma.screening.findFirst();
  const vendor = await prisma.vendor.findFirst();
  const someUser = await prisma.user.findFirst();
  if (!someUser) {
    console.error('No user in DB — aborting.');
    await app.close();
    process.exit(1);
  }

  if (treatment) {
    const org = await prisma.organization.findFirst();
    if (org) {
      const svc = app.get(PdfExportService);
      writeFileSync(
        out('treatment-fr.pdf'),
        await svc.generatePdf(treatment, org, someUser.id, 'fr'),
      );
      writeFileSync(
        out('treatment-en.pdf'),
        await svc.generatePdf(treatment, org, someUser.id, 'en'),
      );
      console.log('treatment FR/EN ✓');
    }
  } else {
    console.warn('treatment: no row, skipped');
  }

  if (screening) {
    const svc = app.get(ScreeningsPdfService);
    writeFileSync(out('screening-fr.pdf'), await svc.generatePdf(screening.id, someUser.id, 'fr'));
    writeFileSync(out('screening-en.pdf'), await svc.generatePdf(screening.id, someUser.id, 'en'));
    console.log('screening FR/EN ✓');
  } else {
    console.warn('screening: no row, skipped');
  }

  if (vendor) {
    const svc = app.get(VendorQuestionnairePdfService);
    writeFileSync(out('vendor-questionnaire.pdf'), await svc.generate(vendor.id, someUser.id));
    console.log('vendor questionnaire ✓');
  } else {
    console.warn('vendor: no row, skipped');
  }

  const reportSvc = app.get(ReportService);
  writeFileSync(out('compliance-report-fr.pdf'), await reportSvc.generateReport(someUser.id, 'fr'));
  writeFileSync(out('compliance-report-en.pdf'), await reportSvc.generateReport(someUser.id, 'en'));
  console.log('compliance report FR/EN ✓');

  const auditSvc = app.get(AuditPackageService);
  writeFileSync(out('audit-package-fr.zip'), await auditSvc.generatePackage(someUser.id, 'fr'));
  writeFileSync(out('audit-package-en.zip'), await auditSvc.generatePackage(someUser.id, 'en'));
  console.log('audit package FR/EN ✓');

  // Unpack each audit-package zip into a sibling folder so every PDF inside
  // the bundle is browsable directly without extracting manually.
  for (const lang of ['fr', 'en']) {
    const zip = out(`audit-package-${lang}.zip`);
    const dest = out(`audit-package-${lang}`);
    mkdirSync(dest, { recursive: true });
    execFileSync('unzip', ['-qo', zip, '-d', dest]);
  }
  console.log(`audit package contents extracted to ${OUT_DIR}/audit-package-{fr,en}/`);

  await app.close();
  console.log(`\nAll samples written to: ${OUT_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
