import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Severity } from '@article30/shared';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { BreachNotificationsService } from '../../src/modules/violations/breach-notifications.service';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';

// Fixed awareness timestamp for 72h boundary tests
const AWARENESS_AT = new Date('2026-04-01T00:00:00Z');
// 71h after awareness — within the 72h window
const FILED_WITHIN_72H = new Date('2026-04-03T23:00:00Z'); // 71h later
// ~73h after awareness — over the 72h window
const FILED_OVER_72H = new Date('2026-04-04T01:00:00Z'); // 73h later

describe('BreachNotificationsService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: BreachNotificationsService;
  let userId: string;
  let violationId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
    const validator = new EntityValidator(prisma);
    const timeline = new TimelineService(prisma, validator);
    svc = new BreachNotificationsService(prisma, validator, timeline);

    const org = await prisma.organization.create({ data: { slug: `bn-${Date.now()}` } });

    const user = await prisma.user.create({
      data: {
        firstName: 'bn-tester',
        lastName: '',
        email: `bn-${Date.now()}@x`,
        password: 'h',
        role: 'DPO',
        approved: true,
      },
    });
    userId = user.id;

    const violation = await prisma.violation.create({
      data: {
        title: 'bn-target',
        severity: Severity.LOW,
        createdBy: userId,
        awarenessAt: AWARENESS_AT,
      },
    });
    violationId = violation.id;
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await module.close();
  });

  afterEach(async () => {
    await prisma.regulatorInteraction.deleteMany({ where: { violationId } });
    await prisma.breachNotificationFiling.deleteMany({ where: { violationId } });
    await prisma.personsNotification.deleteMany({ where: { violationId } });
    await prisma.followUpTimeline.deleteMany({ where: { entityId: violationId } });
  });

  // fileCnil

  it('(1) INITIAL within 72h: succeeds without delayJustification, creates filing + RegulatorInteraction FILING_INITIAL + Timeline', async () => {
    const filing = await svc.fileCnil({
      violationId,
      phase: 'INITIAL',
      filedAt: FILED_WITHIN_72H,
      channel: 'PORTAL',
      filedBy: userId,
    });

    expect(filing.phase).toBe('INITIAL');
    expect(filing.channel).toBe('PORTAL');

    const interactions = await prisma.regulatorInteraction.findMany({
      where: { violationId },
    });
    expect(interactions).toHaveLength(1);
    expect(interactions[0].kind).toBe('FILING_INITIAL');
    expect(interactions[0].direction).toBe('OUTBOUND');

    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'VIOLATION', entityId: violationId },
    });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('NOTIFICATION_SENT');
  });

  it('(2) INITIAL > 72h without delayJustification: throws BadRequestException', async () => {
    await expect(
      svc.fileCnil({
        violationId,
        phase: 'INITIAL',
        filedAt: FILED_OVER_72H,
        channel: 'EMAIL',
        filedBy: userId,
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      svc.fileCnil({
        violationId,
        phase: 'INITIAL',
        filedAt: FILED_OVER_72H,
        channel: 'EMAIL',
        filedBy: userId,
      }),
    ).rejects.toThrow(/72 hours/i);
  });

  it('(3) INITIAL > 72h with delayJustification: succeeds', async () => {
    const filing = await svc.fileCnil({
      violationId,
      phase: 'INITIAL',
      filedAt: FILED_OVER_72H,
      channel: 'PORTAL',
      delayJustification: 'Investigation required additional forensic analysis before filing',
      filedBy: userId,
    });

    expect(filing.phase).toBe('INITIAL');
    expect(filing.filedAt).toEqual(FILED_OVER_72H);

    // RegulatorInteraction + Timeline must still be created
    const interactions = await prisma.regulatorInteraction.findMany({
      where: { violationId },
    });
    expect(interactions).toHaveLength(1);
    expect(interactions[0].kind).toBe('FILING_INITIAL');
  });

  it('(4) COMPLEMENTARY at any time: succeeds with no 72h check, creates filing + RegulatorInteraction FILING_COMPLEMENTARY', async () => {
    // Filed well over 72h — but COMPLEMENTARY is exempt
    const filing = await svc.fileCnil({
      violationId,
      phase: 'COMPLEMENTARY',
      filedAt: FILED_OVER_72H,
      channel: 'POST',
      referenceNumber: 'CNIL-2026-9999',
      filedBy: userId,
    });

    expect(filing.phase).toBe('COMPLEMENTARY');
    expect(filing.referenceNumber).toBe('CNIL-2026-9999');

    const interactions = await prisma.regulatorInteraction.findMany({
      where: { violationId },
    });
    expect(interactions).toHaveLength(1);
    expect(interactions[0].kind).toBe('FILING_COMPLEMENTARY');
    expect(interactions[0].direction).toBe('OUTBOUND');
    expect(interactions[0].referenceNumber).toBe('CNIL-2026-9999');
  });

  // notifyPersons

  it('(5) notifyPersons: creates PersonsNotification row + Timeline NOTIFICATION_SENT event', async () => {
    const notification = await svc.notifyPersons({
      violationId,
      method: 'EMAIL',
      notifiedAt: new Date('2026-04-10T12:00:00Z'),
      recipientScope: 'All affected users in the EU data region',
      sentBy: userId,
    });

    expect(notification.method).toBe('EMAIL');
    expect(notification.recipientScope).toBe('All affected users in the EU data region');

    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'VIOLATION', entityId: violationId },
    });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('NOTIFICATION_SENT');

    const payload = events[0].payload as Record<string, unknown>;
    expect(payload.personsNotificationId).toBe(notification.id);
    expect(payload.method).toBe('EMAIL');
  });

  it('(6) Multiple notifyPersons calls produce multiple rows (no collapse)', async () => {
    await svc.notifyPersons({
      violationId,
      method: 'EMAIL',
      notifiedAt: new Date('2026-04-10T12:00:00Z'),
      recipientScope: 'First batch — EU customers',
      sentBy: userId,
    });
    await svc.notifyPersons({
      violationId,
      method: 'POST',
      notifiedAt: new Date('2026-04-11T09:00:00Z'),
      recipientScope: 'Second batch — postal-only customers',
      sentBy: userId,
    });
    await svc.notifyPersons({
      violationId,
      method: 'PUBLIC_COMMUNICATION',
      notifiedAt: new Date('2026-04-12T08:00:00Z'),
      recipientScope: 'General public announcement via press release',
      sentBy: userId,
    });

    const rows = await prisma.personsNotification.findMany({ where: { violationId } });
    expect(rows).toHaveLength(3);
  });

  // Ordering

  it('(9) listFilings returns filings ordered ASC by filedAt', async () => {
    // Insert in reverse chronological order to verify the sort
    await svc.fileCnil({
      violationId,
      phase: 'COMPLEMENTARY',
      filedAt: new Date('2026-04-15T10:00:00Z'),
      channel: 'EMAIL',
      filedBy: userId,
    });
    await svc.fileCnil({
      violationId,
      phase: 'INITIAL',
      filedAt: FILED_WITHIN_72H, // earlier
      channel: 'PORTAL',
      filedBy: userId,
    });

    const filings = await svc.listFilings(violationId);
    expect(filings).toHaveLength(2);
    expect(filings[0].filedAt.getTime()).toBeLessThanOrEqual(filings[1].filedAt.getTime());
    expect(filings[0].phase).toBe('INITIAL');
    expect(filings[1].phase).toBe('COMPLEMENTARY');
  });

  it('(10) listPersonsNotifications returns rows ordered ASC by notifiedAt', async () => {
    await svc.notifyPersons({
      violationId,
      method: 'POST',
      notifiedAt: new Date('2026-04-20T10:00:00Z'),
      recipientScope: 'Second wave postal customers',
      sentBy: userId,
    });
    await svc.notifyPersons({
      violationId,
      method: 'EMAIL',
      notifiedAt: new Date('2026-04-18T08:00:00Z'), // earlier
      recipientScope: 'First wave email customers',
      sentBy: userId,
    });

    const notifications = await svc.listPersonsNotifications(violationId);
    expect(notifications).toHaveLength(2);
    expect(notifications[0].notifiedAt.getTime()).toBeLessThanOrEqual(
      notifications[1].notifiedAt.getTime(),
    );
    expect(notifications[0].method).toBe('EMAIL');
    expect(notifications[1].method).toBe('POST');
  });

  // Optional tx parameter

  it('(11) fileCnil with external tx: filing + interaction + timeline committed atomically', async () => {
    let capturedFilingId: string | undefined;

    await prisma.$transaction(async tx => {
      const filing = await svc.fileCnil(
        {
          violationId,
          phase: 'INITIAL',
          filedAt: FILED_WITHIN_72H,
          channel: 'PORTAL',
          filedBy: userId,
        },
        tx,
      );
      capturedFilingId = filing.id;
    });

    expect(capturedFilingId).toBeDefined();

    const filing = await prisma.breachNotificationFiling.findUnique({
      where: { id: capturedFilingId },
    });
    expect(filing).not.toBeNull();

    const interaction = await prisma.regulatorInteraction.findFirst({
      where: { violationId },
    });
    expect(interaction).not.toBeNull();
    expect(interaction?.kind).toBe('FILING_INITIAL');

    const event = await prisma.followUpTimeline.findFirst({
      where: { entityId: violationId, kind: 'NOTIFICATION_SENT' },
    });
    expect(event).not.toBeNull();
  });
});
