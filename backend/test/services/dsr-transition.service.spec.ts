import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { DsrService } from '../../src/modules/dsr/dsr.service';
import { DsrPauseService } from '../../src/modules/dsr/dsr-pause.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';
import { DecisionsService } from '../../src/modules/follow-up/decisions.service';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { noopNotificationService } from '../helpers/notification-stub';

describe('DsrService.transition()', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: DsrService;
  let userId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);

    const validator = new EntityValidator(prisma);
    const timeline = new TimelineService(prisma, validator);
    const decisions = new DecisionsService(prisma, validator, timeline);
    const dsrPauseService = new DsrPauseService(prisma, validator);
    // transition() does not emit notifications, so a no-op stub is sufficient.
    const notifications = noopNotificationService();
    svc = new DsrService(prisma, validator, decisions, dsrPauseService, notifications);

    const ts = Date.now();
    const user = await prisma.user.create({
      data: {
        firstName: 'dsr-tr-tester',
        lastName: '',
        email: `dsr-tr-${ts}@x`,
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
    await prisma.followUpDecision.deleteMany();
    await prisma.followUpTimeline.deleteMany();
    await prisma.dsrPauseInterval.deleteMany();
    await prisma.dataSubjectRequest.deleteMany();
  });

  async function seedDsr(status: string = 'RECEIVED') {
    return prisma.dataSubjectRequest.create({
      data: {
        type: 'ACCESS',
        requesterName: 'Jane Doe',
        requesterEmail: `jane-${randomUUID().slice(0, 8)}@example.test`,
        deadline: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        createdBy: userId,
        status: status as never,
      },
    });
  }

  it('(1) RECEIVED → ACKNOWLEDGED sets acknowledgedAt + emits STATUS_CHANGE', async () => {
    const dsr = await seedDsr('RECEIVED');
    const updated = await svc.transition({
      dsrId: dsr.id,
      target: 'ACKNOWLEDGED',
      payload: {},
      performedBy: userId,
    });
    expect(updated.status).toBe('ACKNOWLEDGED');
    expect(updated.acknowledgedAt).not.toBeNull();
    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'DSR', entityId: dsr.id, kind: 'STATUS_CHANGE' },
    });
    expect(events).toHaveLength(1);
  });

  it('(2) ACKNOWLEDGED → AWAITING_REQUESTER opens a DsrPauseInterval', async () => {
    const dsr = await seedDsr('ACKNOWLEDGED');
    await svc.transition({
      dsrId: dsr.id,
      target: 'AWAITING_REQUESTER',
      payload: { reason: 'IDENTITY_VERIFICATION', reasonDetails: 'need ID copy' },
      performedBy: userId,
    });
    const intervals = await prisma.dsrPauseInterval.findMany({ where: { dsrId: dsr.id } });
    expect(intervals).toHaveLength(1);
    expect(intervals[0].resumedAt).toBeNull();
    expect(intervals[0].reason).toBe('IDENTITY_VERIFICATION');
  });

  it('(3) AWAITING_REQUESTER → ACKNOWLEDGED closes the open pause', async () => {
    const dsr = await seedDsr('ACKNOWLEDGED');
    await svc.transition({
      dsrId: dsr.id,
      target: 'AWAITING_REQUESTER',
      payload: { reason: 'OTHER' },
      performedBy: userId,
    });
    await svc.transition({
      dsrId: dsr.id,
      target: 'ACKNOWLEDGED',
      payload: {},
      performedBy: userId,
    });
    const intervals = await prisma.dsrPauseInterval.findMany({ where: { dsrId: dsr.id } });
    expect(intervals).toHaveLength(1);
    expect(intervals[0].resumedAt).not.toBeNull();
  });

  it('(4) AWAITING_REQUESTER → IDENTITY_VERIFIED closes pause AND sets identityVerified=true', async () => {
    const dsr = await seedDsr('ACKNOWLEDGED');
    await svc.transition({
      dsrId: dsr.id,
      target: 'AWAITING_REQUESTER',
      payload: { reason: 'IDENTITY_VERIFICATION' },
      performedBy: userId,
    });
    const updated = await svc.transition({
      dsrId: dsr.id,
      target: 'IDENTITY_VERIFIED',
      payload: {},
      performedBy: userId,
    });
    expect(updated.status).toBe('IDENTITY_VERIFIED');
    expect(updated.identityVerified).toBe(true);
    const intervals = await prisma.dsrPauseInterval.findMany({ where: { dsrId: dsr.id } });
    expect(intervals[0].resumedAt).not.toBeNull();
  });

  it('(5) IDENTITY_VERIFIED → IN_PROGRESS plain status change, no decision', async () => {
    const dsr = await seedDsr('IDENTITY_VERIFIED');
    await svc.transition({
      dsrId: dsr.id,
      target: 'IN_PROGRESS',
      payload: {},
      performedBy: userId,
    });
    const decisions = await prisma.followUpDecision.findMany({ where: { entityId: dsr.id } });
    expect(decisions).toHaveLength(0);
  });

  it('(6) IN_PROGRESS → RESPONDED sets respondedAt + responseNotes, no decision', async () => {
    const dsr = await seedDsr('IN_PROGRESS');
    const updated = await svc.transition({
      dsrId: dsr.id,
      target: 'RESPONDED',
      payload: { responseNotes: 'Provided full export of personal data on 2026-04-26.' },
      performedBy: userId,
    });
    expect(updated.respondedAt).not.toBeNull();
    expect(updated.responseNotes).toBe('Provided full export of personal data on 2026-04-26.');
    const decisions = await prisma.followUpDecision.findMany({ where: { entityId: dsr.id } });
    expect(decisions).toHaveLength(0);
  });

  it('(7) RESPONDED → CLOSED sets closedAt', async () => {
    const dsr = await seedDsr('RESPONDED');
    const updated = await svc.transition({
      dsrId: dsr.id,
      target: 'CLOSED',
      payload: {},
      performedBy: userId,
    });
    expect(updated.closedAt).not.toBeNull();
  });

  it('(8) IN_PROGRESS → REJECTED records REJECT_DSR decision + stores rejection fields', async () => {
    const dsr = await seedDsr('IN_PROGRESS');
    const updated = await svc.transition({
      dsrId: dsr.id,
      target: 'REJECTED',
      payload: {
        rejectionReason: 'MANIFESTLY_UNFOUNDED',
        rejectionDetails: 'Request was clearly frivolous and abusive in nature.',
      },
      performedBy: userId,
    });
    expect(updated.rejectionReason).toBe('MANIFESTLY_UNFOUNDED');
    expect(updated.rejectionDetails).toBe('Request was clearly frivolous and abusive in nature.');
    const decision = await prisma.followUpDecision.findFirst({
      where: { entityId: dsr.id, kind: 'REJECT_DSR' },
    });
    expect(decision).not.toBeNull();
    expect(decision?.rationale).toContain('MANIFESTLY_UNFOUNDED');
  });

  it('(9) IN_PROGRESS → PARTIALLY_FULFILLED records CLOSE_DSR_PARTIAL decision + stores notes', async () => {
    const dsr = await seedDsr('IN_PROGRESS');
    const updated = await svc.transition({
      dsrId: dsr.id,
      target: 'PARTIALLY_FULFILLED',
      payload: { partialFulfilmentNotes: 'Provided access to two out of three systems.' },
      performedBy: userId,
    });
    expect(updated.partialFulfilmentNotes).toBe('Provided access to two out of three systems.');
    const decision = await prisma.followUpDecision.findFirst({
      where: { entityId: dsr.id, kind: 'CLOSE_DSR_PARTIAL' },
    });
    expect(decision).not.toBeNull();
  });

  it('(10) RECEIVED → IN_PROGRESS rejects (invalid edge)', async () => {
    const dsr = await seedDsr('RECEIVED');
    await expect(
      svc.transition({
        dsrId: dsr.id,
        target: 'IN_PROGRESS',
        payload: {},
        performedBy: userId,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('(11) CLOSED → anything rejects', async () => {
    const dsr = await seedDsr('CLOSED');
    await expect(
      svc.transition({
        dsrId: dsr.id,
        target: 'RECEIVED',
        payload: {},
        performedBy: userId,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('(12) AWAITING_REQUESTER twice in a row throws (pause guard)', async () => {
    const dsr = await seedDsr('ACKNOWLEDGED');
    await svc.transition({
      dsrId: dsr.id,
      target: 'AWAITING_REQUESTER',
      payload: { reason: 'OTHER' },
      performedBy: userId,
    });
    // Force back to a state that allows AWAITING_REQUESTER without going through ACK first
    await prisma.dataSubjectRequest.update({
      where: { id: dsr.id },
      data: { status: 'IN_PROGRESS' as never },
    });
    await expect(
      svc.transition({
        dsrId: dsr.id,
        target: 'AWAITING_REQUESTER',
        payload: { reason: 'SCOPE_CLARIFICATION' },
        performedBy: userId,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('(13) forged FK reject — random UUID', async () => {
    await expect(
      svc.transition({
        dsrId: randomUUID(),
        target: 'ACKNOWLEDGED',
        payload: {},
        performedBy: userId,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
