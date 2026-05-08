import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Severity } from '@article30/shared';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { RemediationService } from '../../src/modules/violations/remediation.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { noopNotificationService } from '../helpers/notification-stub';

describe('RemediationService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: RemediationService;
  let userId: string;
  let secondUserId: string;
  let violationId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
    const validator = new EntityValidator(prisma);
    const timeline = new TimelineService(prisma, validator);
    // create()/update() emit action-item.assigned, but this spec asserts only
    // persistence + Timeline rows — a no-op stub keeps the test focused.
    // Notification side-effects are covered separately in
    // test/notifications/action-item-assigned.spec.ts.
    const notifications = noopNotificationService();
    svc = new RemediationService(prisma, validator, timeline, notifications);

    await prisma.organization.create({ data: { slug: `rem-${Date.now()}` } });

    const user = await prisma.user.create({
      data: {
        firstName: 'rem-tester',
        lastName: '',
        email: `rem-${Date.now()}@x`,
        password: 'h',
        role: 'DPO',
        approved: true,
      },
    });
    userId = user.id;

    const secondUser = await prisma.user.create({
      data: {
        firstName: 'rem-second',
        lastName: '',
        email: `rem-second-${Date.now()}@x`,
        password: 'h',
        role: 'EDITOR',
        approved: true,
      },
    });
    secondUserId = secondUser.id;

    const violation = await prisma.violation.create({
      data: {
        title: 'rem-target',
        severity: Severity.LOW,
        awarenessAt: new Date(),
        createdBy: userId,
      },
    });
    violationId = violation.id;
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await module.close();
  });

  afterEach(async () => {
    await prisma.remediationActionItem.deleteMany({ where: { violationId } });
    await prisma.followUpTimeline.deleteMany({ where: { entityId: violationId } });
  });

  // (1) create

  it('(1) create returns row with status PENDING and emits Timeline ASSIGNMENT', async () => {
    const deadline = new Date('2026-06-01T00:00:00Z');
    const item = await svc.create({
      violationId,
      title: 'Patch the vulnerable endpoint',
      description: 'Apply security patch to the affected service',
      ownerId: userId,
      deadline,
    });

    expect(item.status).toBe('PENDING');
    expect(item.violationId).toBe(violationId);
    expect(item.title).toBe('Patch the vulnerable endpoint');
    expect(item.ownerId).toBe(userId);
    expect(item.doneAt).toBeNull();
    expect(item.doneBy).toBeNull();

    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'VIOLATION', entityId: violationId },
    });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('ASSIGNMENT');

    const payload = events[0].payload as Record<string, unknown>;
    expect(payload.actionItemId).toBe(item.id);
    expect(payload.title).toBe('Patch the vulnerable endpoint');
    expect(payload.ownerId).toBe(userId);
    expect(payload.deadline).toBe(deadline.toISOString());
  });

  // (2) update title

  it('(2) update title modifies title and preserves other fields', async () => {
    const item = await svc.create({
      violationId,
      title: 'Original title',
      ownerId: userId,
      deadline: new Date('2026-07-01T00:00:00Z'),
    });

    const updated = await svc.update({
      actionItemId: item.id,
      title: 'Updated title',
      updatedBy: userId,
    });

    expect(updated.title).toBe('Updated title');
    expect(updated.status).toBe('PENDING');
    expect(updated.ownerId).toBe(userId);
    expect(updated.doneAt).toBeNull();
    expect(updated.doneBy).toBeNull();
  });

  // (3) update status to IN_PROGRESS

  it('(3) update status to IN_PROGRESS keeps doneAt null', async () => {
    const item = await svc.create({
      violationId,
      title: 'In progress item',
      ownerId: userId,
      deadline: new Date('2026-07-15T00:00:00Z'),
    });

    const updated = await svc.update({
      actionItemId: item.id,
      status: 'IN_PROGRESS',
      updatedBy: userId,
    });

    expect(updated.status).toBe('IN_PROGRESS');
    expect(updated.doneAt).toBeNull();
    expect(updated.doneBy).toBeNull();
  });

  // (4) update status to DONE

  it('(4) update status to DONE sets doneAt and doneBy to updatedBy', async () => {
    const before = new Date();
    const item = await svc.create({
      violationId,
      title: 'Completable item',
      ownerId: userId,
      deadline: new Date('2026-08-01T00:00:00Z'),
    });

    const updated = await svc.update({
      actionItemId: item.id,
      status: 'DONE',
      updatedBy: secondUserId,
    });

    expect(updated.status).toBe('DONE');
    expect(updated.doneAt).not.toBeNull();
    expect(updated.doneAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(updated.doneBy).toBe(secondUserId);
  });

  // (5) revert from DONE

  it('(5) update status DONE then back to IN_PROGRESS clears doneAt and doneBy', async () => {
    const item = await svc.create({
      violationId,
      title: 'Reversible item',
      ownerId: userId,
      deadline: new Date('2026-08-15T00:00:00Z'),
    });

    // Mark as DONE
    await svc.update({
      actionItemId: item.id,
      status: 'DONE',
      updatedBy: userId,
    });

    // Revert to IN_PROGRESS
    const reverted = await svc.update({
      actionItemId: item.id,
      status: 'IN_PROGRESS',
      updatedBy: userId,
    });

    expect(reverted.status).toBe('IN_PROGRESS');
    expect(reverted.doneAt).toBeNull();
    expect(reverted.doneBy).toBeNull();
  });

  // (6) list ordered by deadline ASC

  it('(7) list returns items ordered ASC by deadline then id', async () => {
    await svc.create({
      violationId,
      title: 'Latest deadline',
      ownerId: userId,
      deadline: new Date('2026-12-01T00:00:00Z'),
    });
    await svc.create({
      violationId,
      title: 'Earliest deadline',
      ownerId: userId,
      deadline: new Date('2026-09-01T00:00:00Z'),
    });
    await svc.create({
      violationId,
      title: 'Middle deadline',
      ownerId: userId,
      deadline: new Date('2026-10-15T00:00:00Z'),
    });

    const items = await svc.list(violationId);
    expect(items).toHaveLength(3);
    expect(items[0].title).toBe('Earliest deadline');
    expect(items[1].title).toBe('Middle deadline');
    expect(items[2].title).toBe('Latest deadline');
    expect(items[0].deadline.getTime()).toBeLessThanOrEqual(items[1].deadline.getTime());
    expect(items[1].deadline.getTime()).toBeLessThanOrEqual(items[2].deadline.getTime());
  });
});
