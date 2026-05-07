import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Severity } from '@article30/shared';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { ViolationsService } from '../../src/modules/violations/violations.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';
import { DecisionsService } from '../../src/modules/follow-up/decisions.service';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { BreachNotificationsService } from '../../src/modules/violations/breach-notifications.service';
import { noopNotificationService } from '../helpers/notification-stub';

// Fixed awareness timestamp for 72h boundary tests
const AWARENESS_AT_RECENT = new Date(); // now — within 72h window

// An awareness date 73h in the past
const AWARENESS_AT_OLD = new Date(Date.now() - 73 * 60 * 60 * 1000);

describe('ViolationsService.transition()', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: ViolationsService;
  let decisions: DecisionsService;
  let userId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);

    const validator = new EntityValidator(prisma);
    const timeline = new TimelineService(prisma, validator);
    decisions = new DecisionsService(prisma, validator, timeline);
    const breachNotifications = new BreachNotificationsService(prisma, validator, timeline);
    // transition() does not emit notifications, so a no-op stub is sufficient.
    const notifications = noopNotificationService();
    svc = new ViolationsService(prisma, validator, decisions, breachNotifications, notifications);

    const org = await prisma.organization.create({ data: { slug: `tr-${Date.now()}` } });

    const user = await prisma.user.create({
      data: {
        firstName: 'tr-tester',
        lastName: '',
        email: `tr-${Date.now()}@x`,
        password: 'h',
        role: 'DPO',
        approved: true,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await module.close();
  });

  afterEach(async () => {
    // Clean up transition-related rows between tests, keeping org + user + violations seeded per-test
    await prisma.followUpDecision.deleteMany();
    await prisma.followUpTimeline.deleteMany();
    await prisma.regulatorInteraction.deleteMany();
    await prisma.breachNotificationFiling.deleteMany();
    await prisma.personsNotification.deleteMany();
    await prisma.violation.deleteMany();
  });

  // Helpers

  async function seedViolation(
    overrides: {
      status?: string;
      awarenessAt?: Date;
    } = {},
  ) {
    return prisma.violation.create({
      data: {
        title: 'tr-target',
        severity: Severity.MEDIUM,
        createdBy: userId,
        status: (overrides.status ?? 'RECEIVED') as never,
        awarenessAt: overrides.awarenessAt ?? AWARENESS_AT_RECENT,
      },
    });
  }

  // Force a violation into a specific status directly (for seeding multi-step scenarios)
  async function setStatus(violationId: string, status: string) {
    await prisma.violation.update({
      where: { id: violationId },
      data: { status: status as never },
    });
  }

  // Test 1: DISMISSED happy path

  it('(1) DISMISSED happy path: status updated, dismissalReason stored, DISMISS_BREACH Decision recorded, STATUS_CHANGE Timeline emitted', async () => {
    const violation = await seedViolation();

    const updated = await svc.transition({
      violationId: violation.id,
      target: 'DISMISSED',
      payload: { dismissalReason: 'This is not a real breach, false alarm triggered.' },
      performedBy: userId,
    });

    expect(updated.status).toBe('DISMISSED');
    expect(updated.dismissalReason).toBe('This is not a real breach, false alarm triggered.');

    // Decision recorded
    const dec = await prisma.followUpDecision.findFirst({
      where: { entityId: violation.id, kind: 'DISMISS_BREACH' },
    });
    expect(dec).not.toBeNull();
    expect(dec?.kind).toBe('DISMISS_BREACH');
    expect(dec?.rationale).toBe('This is not a real breach, false alarm triggered.');

    // Timeline STATUS_CHANGE
    const events = await prisma.followUpTimeline.findMany({
      where: { entityId: violation.id, kind: 'STATUS_CHANGE' },
    });
    expect(events).toHaveLength(1);
    const payload = events[0].payload as Record<string, unknown>;
    expect(payload.from).toBe('RECEIVED');
    expect(payload.to).toBe('DISMISSED');
  });

  // Test 2: DISMISSED with reason too short

  it('(2) DISMISSED with dismissalReason too short: throws BadRequestException', async () => {
    const violation = await seedViolation();

    await expect(
      svc.transition({
        violationId: violation.id,
        target: 'DISMISSED',
        payload: { dismissalReason: 'Short' },
        performedBy: userId,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // Test 3: TRIAGED from RECEIVED — mechanical, no Decision

  it('(3) TRIAGED from RECEIVED: succeeds, no FollowUpDecision recorded', async () => {
    const violation = await seedViolation();

    const updated = await svc.transition({
      violationId: violation.id,
      target: 'TRIAGED',
      payload: {},
      performedBy: userId,
    });

    expect(updated.status).toBe('TRIAGED');

    const decisions = await prisma.followUpDecision.findMany({
      where: { entityId: violation.id },
    });
    expect(decisions).toHaveLength(0);

    // STATUS_CHANGE timeline event still emitted
    const events = await prisma.followUpTimeline.findMany({
      where: { entityId: violation.id, kind: 'STATUS_CHANGE' },
    });
    expect(events).toHaveLength(1);
  });

  // Test 4: Invalid edge

  it('(4) Invalid edge RECEIVED → REMEDIATED: throws BadRequestException with prescribed message', async () => {
    const violation = await seedViolation();

    await expect(
      svc.transition({
        violationId: violation.id,
        target: 'REMEDIATED',
        payload: {},
        performedBy: userId,
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      svc.transition({
        violationId: violation.id,
        target: 'REMEDIATED',
        payload: {},
        performedBy: userId,
      }),
    ).rejects.toThrow(/Invalid transition: RECEIVED → REMEDIATED/);
  });

  // Test 5: NOTIFIED_CNIL within 72h

  it('(5) NOTIFIED_CNIL within 72h: filing + RegulatorInteraction + Decision NOTIFY_CNIL + STATUS_CHANGE + NOTIFICATION_SENT', async () => {
    const violation = await seedViolation({ awarenessAt: AWARENESS_AT_RECENT });
    await setStatus(violation.id, 'NOTIFICATION_PENDING');

    const updated = await svc.transition({
      violationId: violation.id,
      target: 'NOTIFIED_CNIL',
      payload: { phase: 'INITIAL', channel: 'PORTAL', referenceNumber: 'CNIL-2026-001' },
      performedBy: userId,
    });

    expect(updated.status).toBe('NOTIFIED_CNIL');

    // BreachNotificationFiling created
    const filings = await prisma.breachNotificationFiling.findMany({
      where: { violationId: violation.id },
    });
    expect(filings).toHaveLength(1);
    expect(filings[0].phase).toBe('INITIAL');

    // RegulatorInteraction FILING_INITIAL created
    const interactions = await prisma.regulatorInteraction.findMany({
      where: { violationId: violation.id },
    });
    expect(interactions).toHaveLength(1);
    expect(interactions[0].kind).toBe('FILING_INITIAL');

    // Decision NOTIFY_CNIL recorded
    const dec = await prisma.followUpDecision.findFirst({
      where: { entityId: violation.id, kind: 'NOTIFY_CNIL' },
    });
    expect(dec).not.toBeNull();

    // Timeline: STATUS_CHANGE + NOTIFICATION_SENT
    const allEvents = await prisma.followUpTimeline.findMany({
      where: { entityId: violation.id },
    });
    const kinds = allEvents.map(e => e.kind).sort();
    expect(kinds).toContain('STATUS_CHANGE');
    expect(kinds).toContain('NOTIFICATION_SENT');
    // Also DECISION from DecisionsService.record
    expect(kinds).toContain('DECISION');
  });

  // Test 6: NOTIFIED_CNIL > 72h without delayJustification

  it('(6) NOTIFIED_CNIL > 72h without delayJustification: throws BadRequestException', async () => {
    const violation = await seedViolation({ awarenessAt: AWARENESS_AT_OLD });
    await setStatus(violation.id, 'NOTIFICATION_PENDING');

    await expect(
      svc.transition({
        violationId: violation.id,
        target: 'NOTIFIED_CNIL',
        payload: { phase: 'INITIAL', channel: 'PORTAL' },
        performedBy: userId,
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      svc.transition({
        violationId: violation.id,
        target: 'NOTIFIED_CNIL',
        payload: { phase: 'INITIAL', channel: 'PORTAL' },
        performedBy: userId,
      }),
    ).rejects.toThrow(/72 hours/i);
  });

  // Test 7: NOTIFIED_CNIL > 72h with delayJustification

  it('(7) NOTIFIED_CNIL > 72h with delayJustification: succeeds', async () => {
    const violation = await seedViolation({ awarenessAt: AWARENESS_AT_OLD });
    await setStatus(violation.id, 'NOTIFICATION_PENDING');

    const updated = await svc.transition({
      violationId: violation.id,
      target: 'NOTIFIED_CNIL',
      payload: {
        phase: 'INITIAL',
        channel: 'PORTAL',
        delayJustification: 'Extensive forensic investigation required before filing was possible',
      },
      performedBy: userId,
    });

    expect(updated.status).toBe('NOTIFIED_CNIL');

    const filings = await prisma.breachNotificationFiling.findMany({
      where: { violationId: violation.id },
    });
    expect(filings).toHaveLength(1);
  });

  // Test 8: PERSONS_NOTIFICATION_WAIVED

  it('(8) PERSONS_NOTIFICATION_WAIVED: Decision WAIVE_PERSONS_NOTIFICATION recorded, waiver fields stored', async () => {
    const violation = await seedViolation();
    await setStatus(violation.id, 'NOTIFICATION_PENDING');

    const updated = await svc.transition({
      violationId: violation.id,
      target: 'PERSONS_NOTIFICATION_WAIVED',
      payload: {
        ground: 'ENCRYPTION',
        justification: 'All data was encrypted with AES-256; no risk to data subjects exists.',
      },
      performedBy: userId,
    });

    expect(updated.status).toBe('PERSONS_NOTIFICATION_WAIVED');
    expect(updated.personsNotificationWaiver).toBe('ENCRYPTION');
    expect(updated.waiverJustification).toBe(
      'All data was encrypted with AES-256; no risk to data subjects exists.',
    );

    const dec = await prisma.followUpDecision.findFirst({
      where: { entityId: violation.id, kind: 'WAIVE_PERSONS_NOTIFICATION' },
    });
    expect(dec).not.toBeNull();
  });

  // Test 9: PERSONS_NOTIFIED

  it('(9) PERSONS_NOTIFIED: PersonsNotification row created via composed service', async () => {
    const violation = await seedViolation();
    await setStatus(violation.id, 'NOTIFIED_CNIL');

    const updated = await svc.transition({
      violationId: violation.id,
      target: 'PERSONS_NOTIFIED',
      payload: { method: 'EMAIL', recipientScope: 'All registered users in France data zone' },
      performedBy: userId,
    });

    expect(updated.status).toBe('PERSONS_NOTIFIED');

    const notifications = await prisma.personsNotification.findMany({
      where: { violationId: violation.id },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].method).toBe('EMAIL');

    // STATUS_CHANGE + NOTIFICATION_SENT
    const events = await prisma.followUpTimeline.findMany({
      where: { entityId: violation.id },
    });
    const kinds = events.map(e => e.kind);
    expect(kinds).toContain('STATUS_CHANGE');
    expect(kinds).toContain('NOTIFICATION_SENT');
  });

  // Test 10: REOPENED from CLOSED

  it('(10) REOPENED from CLOSED: Decision kind REOPEN, rationale stored', async () => {
    const violation = await seedViolation();
    await setStatus(violation.id, 'CLOSED');

    const updated = await svc.transition({
      violationId: violation.id,
      target: 'REOPENED',
      payload: { rationale: 'New evidence surfaced indicating the breach was more extensive.' },
      performedBy: userId,
    });

    expect(updated.status).toBe('REOPENED');

    const dec = await prisma.followUpDecision.findFirst({
      where: { entityId: violation.id, kind: 'REOPEN' },
    });
    expect(dec).not.toBeNull();
    expect(dec?.rationale).toBe('New evidence surfaced indicating the breach was more extensive.');
  });

  // Test 11: REOPENED from non-CLOSED

  it('(11) REOPENED from RECEIVED (non-CLOSED): throws BadRequestException', async () => {
    const violation = await seedViolation(); // status RECEIVED

    await expect(
      svc.transition({
        violationId: violation.id,
        target: 'REOPENED',
        payload: { rationale: 'Attempting invalid reopen from RECEIVED status.' },
        performedBy: userId,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // Test 12: Forged FK reject

  it('(12) Forged-FK reject: throws NotFoundException for nonexistent violationId', async () => {
    await expect(
      svc.transition({
        violationId: '00000000-0000-0000-0000-000000000000',
        target: 'TRIAGED',
        payload: {},
        performedBy: userId,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  // Test 14: Atomicity — if Decision record fails, violation status NOT updated ─

  it('(14) Atomicity: if Decision record throws, violation status is NOT updated (transaction rolls back)', async () => {
    const violation = await seedViolation();

    // Spy on decisions.record to force it to throw after being called inside the transaction
    const spy = vi.spyOn(decisions, 'record').mockImplementationOnce(async () => {
      throw new Error('Simulated decision write failure');
    });

    await expect(
      svc.transition({
        violationId: violation.id,
        target: 'DISMISSED',
        payload: { dismissalReason: 'This should rollback due to simulated decision failure.' },
        performedBy: userId,
      }),
    ).rejects.toThrow('Simulated decision write failure');

    spy.mockRestore();

    // Verify violation status was NOT updated (transaction rolled back)
    const unchanged = await prisma.violation.findUniqueOrThrow({
      where: { id: violation.id },
      select: { status: true },
    });
    expect(unchanged.status).toBe('RECEIVED');

    // No timeline events
    const events = await prisma.followUpTimeline.findMany({
      where: { entityId: violation.id },
    });
    expect(events).toHaveLength(0);
  });
});
