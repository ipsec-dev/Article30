import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';
import { DsrPauseService } from '../../src/modules/dsr/dsr-pause.service';
import { cleanupDatabase } from '../helpers';

describe('DsrPauseService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: DsrPauseService;
  let userId: string;
  let dsrId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
    const validator = new EntityValidator(prisma);
    svc = new DsrPauseService(prisma, validator);

    const user = await prisma.user.create({
      data: {
        firstName: 'pause-user',
        lastName: '',
        email: `pause-${Date.now()}@x`,
        password: 'h',
        role: 'DPO',
        approved: true,
      },
    });
    userId = user.id;

    const dsr = await prisma.dataSubjectRequest.create({
      data: {
        type: 'ACCESS',
        requesterName: 'Jane Doe',
        requesterEmail: 'jane@example.test',
        deadline: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
    dsrId = dsr.id;
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await module.close();
  });

  afterEach(async () => {
    await prisma.dsrPauseInterval.deleteMany();
    await prisma.followUpTimeline.deleteMany();
  });

  // Test 1: open creates an interval and emits PAUSE_STARTED timeline event
  it('open creates a DsrPauseInterval and emits a PAUSE_STARTED Timeline event', async () => {
    const interval = await svc.open({
      dsrId,
      reason: 'IDENTITY_VERIFICATION',
      startedBy: userId,
    });

    expect(interval.dsrId).toBe(dsrId);
    expect(interval.reason).toBe('IDENTITY_VERIFICATION');
    expect(interval.resumedAt).toBeNull();
    expect(interval.startedBy).toBe(userId);

    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'DSR', entityId: dsrId },
    });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('PAUSE_STARTED');
    expect(events[0].entityId).toBe(dsrId);
  });

  // Test 2: open when one is already open throws BadRequestException
  it('open throws BadRequestException when there is already an open pause', async () => {
    await svc.open({
      dsrId,
      reason: 'SCOPE_CLARIFICATION',
      startedBy: userId,
    });

    await expect(
      svc.open({
        dsrId,
        reason: 'OTHER',
        startedBy: userId,
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      svc.open({
        dsrId,
        reason: 'OTHER',
        startedBy: userId,
      }),
    ).rejects.toThrow('DSR already has an open pause');
  });

  // Test 3: close sets resumedAt and emits PAUSE_ENDED Timeline event
  it('close sets resumedAt and emits a PAUSE_ENDED Timeline event', async () => {
    await svc.open({
      dsrId,
      reason: 'IDENTITY_VERIFICATION',
      startedBy: userId,
    });

    const closed = await svc.close({
      dsrId,
      closedBy: userId,
    });

    expect(closed.resumedAt).not.toBeNull();
    expect(closed.resumedAt).toBeInstanceOf(Date);

    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'DSR', entityId: dsrId },
      orderBy: { performedAt: 'asc' },
    });
    expect(events).toHaveLength(2);
    expect(events[0].kind).toBe('PAUSE_STARTED');
    expect(events[1].kind).toBe('PAUSE_ENDED');
  });

  // Test 4: close when none is open throws NotFoundException
  it('close throws NotFoundException when there is no open pause', async () => {
    await expect(
      svc.close({
        dsrId,
        closedBy: userId,
      }),
    ).rejects.toThrow(NotFoundException);

    await expect(
      svc.close({
        dsrId,
        closedBy: userId,
      }),
    ).rejects.toThrow('No open pause to close');
  });

  // Test 5: open → close → open works (multiple intervals all returned by list)
  it('supports multiple pause cycles over DSR lifetime', async () => {
    await svc.open({
      dsrId,
      reason: 'IDENTITY_VERIFICATION',
      startedBy: userId,
    });
    await svc.close({ dsrId, closedBy: userId });
    await svc.open({
      dsrId,
      reason: 'SCOPE_CLARIFICATION',
      startedBy: userId,
    });

    const intervals = await svc.list(dsrId);
    expect(intervals).toHaveLength(2);
    expect(intervals[0].reason).toBe('IDENTITY_VERIFICATION');
    expect(intervals[0].resumedAt).not.toBeNull();
    expect(intervals[1].reason).toBe('SCOPE_CLARIFICATION');
    expect(intervals[1].resumedAt).toBeNull();
  });

  // Test 6: list returns ASC by pausedAt, then id (stable secondary sort)
  it('list returns intervals ordered ASC by pausedAt then id', async () => {
    // Create two intervals with same pausedAt to verify stable sort by id.
    // Both must have resumedAt set, otherwise the partial unique
    // dsr_pause_one_open_per_dsr (resumedAt IS NULL) blocks the second insert.
    const sharedDate = new Date('2026-01-15T12:00:00.000Z');
    const sharedResumed = new Date('2026-01-15T13:00:00.000Z');

    const a = await prisma.dsrPauseInterval.create({
      data: {
        dsrId,
        reason: 'IDENTITY_VERIFICATION',
        pausedAt: sharedDate,
        resumedAt: sharedResumed,
        startedBy: userId,
      },
    });
    const b = await prisma.dsrPauseInterval.create({
      data: {
        dsrId,
        reason: 'SCOPE_CLARIFICATION',
        pausedAt: sharedDate,
        resumedAt: sharedResumed,
        startedBy: userId,
      },
    });

    const intervals = await svc.list(dsrId);
    expect(intervals).toHaveLength(2);
    // Stable secondary sort by id means a comes before b (UUIDs are v4 but
    // insertion order is deterministic in the same transaction boundary)
    const ids = intervals.map(i => i.id);
    if (a.id < b.id) {
      expect(ids[0]).toBe(a.id);
      expect(ids[1]).toBe(b.id);
    } else {
      expect(ids[0]).toBe(b.id);
      expect(ids[1]).toBe(a.id);
    }
  });
});
