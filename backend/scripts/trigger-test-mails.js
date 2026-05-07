/* eslint-disable */
/**
 * One-shot script that triggers every notification kind so the operator can
 * see them in Mailpit (http://localhost:8025).
 *
 * Run: pnpm --filter @article30/backend trigger:test-mails
 *
 * Triggers:
 *   - password-reset           (AuthService.forgotPassword on the demo admin)
 *   - dsr.submitted            (instant — DsrService.create with a fresh DSR)
 *   - violation.logged
 *   - violation.high-severity-72h-kickoff   (HIGH severity → both fire)
 *   - vendor.questionnaire-returned         (VendorAssessmentsService.submit)
 *   - action-item.assigned                  (RemediationService.create)
 *   - dsr.deadline-approaching              (scheduler — T-7 stripe)
 *   - vendor.dpa-expiring                   (scheduler — T-30 stripe)
 *   - treatment.review-due                  (scheduler — T-7 stripe)
 *   - violation.72h-window                  (scheduler — T-24h stripe)
 *
 * Idempotent: clears notification_log and re-creates all demo records each
 * run so re-running surfaces every mail again.
 */
const { NestFactory } = require('@nestjs/core');
const bcrypt = require('bcrypt');
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { AuthService } = require('../dist/src/modules/auth/auth.service');
const { DsrService } = require('../dist/src/modules/dsr/dsr.service');
const { ViolationsService } = require('../dist/src/modules/violations/violations.service');
const { RemediationService } = require('../dist/src/modules/violations/remediation.service');
const {
  VendorAssessmentsService,
} = require('../dist/src/modules/vendors/vendor-assessments.service');
const {
  NotificationsScheduler,
} = require('../dist/src/modules/notifications/notifications.scheduler');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const DEMO_ADMIN_EMAIL = 'demo-admin@example.test';
const DEMO_OWNER_EMAIL = 'demo-owner@example.test';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const auth = app.get(AuthService);
  const dsr = app.get(DsrService);
  const violations = app.get(ViolationsService);
  const remediation = app.get(RemediationService);
  const vendorAssessments = app.get(VendorAssessmentsService);
  const scheduler = app.get(NotificationsScheduler);

  console.log('— Resetting notification_log so every mail re-fires —');
  await prisma.notificationLog.deleteMany();

  console.log('— Ensuring single-tenant org with dpoEmail —');
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        slug: `demo-${Date.now()}`,
        locale: 'fr',
        dpoEmail: 'dpo@example.test',
        dpoName: 'Diane Demo',
        companyName: 'Acme Demo',
      },
    });
    console.log('  created org', org.id);
  } else {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: {
        dpoEmail: org.dpoEmail ?? 'dpo@example.test',
        dpoName: org.dpoName ?? 'Diane Demo',
        companyName: org.companyName ?? 'Acme Demo',
        notifyDsrDeadline: true,
        notifyVendorDpaExpiry: true,
        notifyTreatmentReview: true,
        notifyViolation72h: true,
      },
    });
    console.log('  reused org', org.id, '— ensured toggles are ON');
  }

  console.log('— Ensuring demo admin (target for password-reset) —');
  let admin = await prisma.user.findUnique({ where: { email: DEMO_ADMIN_EMAIL } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        firstName: 'Adèle',
        lastName: 'Admin',
        email: DEMO_ADMIN_EMAIL,
        password: await bcrypt.hash('demoadmin123!', 10),
        role: 'ADMIN',
        approved: true,
      },
    });
  }

  console.log('— Ensuring demo owner (target for action-item.assigned) —');
  let owner = await prisma.user.findUnique({ where: { email: DEMO_OWNER_EMAIL } });
  if (!owner) {
    owner = await prisma.user.create({
      data: {
        firstName: 'Olivier',
        lastName: 'Owner',
        email: DEMO_OWNER_EMAIL,
        password: await bcrypt.hash('demoowner123!', 10),
        role: 'EDITOR',
        approved: true,
      },
    });
  }

  // 1. password-reset (FR)
  console.log('\n[1/8] password-reset (FR)');
  await auth.forgotPassword({ email: admin.email }, 'fr-FR');

  // 2. dsr.submitted (instant)
  console.log('[2/8] dsr.submitted');
  const newDsr = await dsr.create(
    {
      type: 'ACCESS',
      requesterName: 'René Demandeur',
      requesterEmail: 'requester@example.test',
      description: 'Demo run — please ignore.',
    },
    admin.id,
  );

  // 3. violation.logged + violation.high-severity-72h-kickoff
  console.log('[3/8] violation.logged + violation.high-severity-72h-kickoff (HIGH)');
  const newViolation = await violations.create(
    {
      title: 'Demo violation — high severity',
      description: 'Demo run — please ignore.',
      severity: 'HIGH',
      // 48h ago → 24h remaining in the 72h window → T-24h stripe.
      discoveredAt: new Date(Date.now() - 48 * HOUR).toISOString(),
    },
    admin.id,
  );

  // 4. vendor.questionnaire-returned (instant)
  console.log('[4/8] vendor.questionnaire-returned');
  const vendorForAssessment = await prisma.vendor.create({
    data: {
      name: 'Demo Vendor (assessment)',
      createdBy: admin.id,
    },
  });
  const assessment = await prisma.vendorAssessment.create({
    data: {
      vendorId: vendorForAssessment.id,
      status: 'IN_PROGRESS',
      createdBy: admin.id,
    },
  });
  await vendorAssessments.submit(assessment.id);

  // 5. action-item.assigned (instant)
  console.log('[5/8] action-item.assigned');
  await remediation.create({
    violationId: newViolation.id,
    title: 'Demo remediation item',
    ownerId: owner.id,
    deadline: new Date(Date.now() + 7 * DAY),
  });

  // Scheduled-kind setup
  // The four scheduled kinds need records inside their lead-time windows.
  // Create a vendor with DPA expiring exactly 30d out (T-30) and a treatment
  // with nextReviewAt exactly 7d out (T-7). The DSR created in step 2 has
  // its deadline set by DsrService.create() — we override it to today+7 so
  // the daily sweep finds it. Same for the violation: it's HIGH and
  // 48h-old, so the violation-72h sweep (T-24h stripe) will pick it up.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Lead-time stripes hit when Math.round((deadline - today) / DAY) === 7 / 30 / etc.
  // So the offsets must be EXACTLY N days from midnight (today). +12h rounds up to N+1
  // and the sweep silently misses the record. Add 1h so the timestamp is mid-morning
  // (visually obvious in mailpit) but still rounds back to N.
  console.log('— Pinning DSR deadline to T-7 (exactly 7 days from midnight) —');
  await prisma.dataSubjectRequest.update({
    where: { id: newDsr.id },
    data: { deadline: new Date(today.getTime() + 7 * DAY + HOUR) },
  });

  console.log('— Creating a vendor with DPA expiring T-30 —');
  await prisma.vendor.create({
    data: {
      name: 'Demo Vendor (DPA T-30)',
      createdBy: admin.id,
      dpaExpiry: new Date(today.getTime() + 30 * DAY + HOUR),
    },
  });

  console.log('— Creating a treatment with nextReviewAt T-7 —');
  await prisma.treatment.create({
    data: {
      name: 'Demo treatment',
      purpose: 'Demo run',
      createdBy: admin.id,
      assignedTo: owner.id,
      nextReviewAt: new Date(today.getTime() + 7 * DAY + HOUR),
    },
  });

  // 6. dsr.deadline-approaching (scheduler)
  // 7. vendor.dpa-expiring (scheduler)
  // 8. treatment.review-due (scheduler)
  console.log('\n[6-8/8] daily sweep — DSR / vendor DPA / treatment review');
  await scheduler.runDailyDeadlineSweep();

  // 9. violation.72h-window (scheduler)
  console.log('[9/8] 72h sweep — violation T-24h');
  await scheduler.runViolation72hSweep();

  console.log('\n✅ All notifications dispatched. Open http://localhost:8025 to review.');
  await app.close();
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
