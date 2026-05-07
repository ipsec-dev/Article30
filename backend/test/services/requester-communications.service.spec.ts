import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';
import { RequesterCommunicationsService } from '../../src/modules/dsr/requester-communications.service';
import { seedDsr } from '../e2e/seed';
import { cleanupDatabase } from '../helpers';
import type { RequesterCommunicationKind } from '@prisma/client';

describe('RequesterCommunicationsService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: RequesterCommunicationsService;

  let userId: string;
  let dsrId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
    const validator = new EntityValidator(prisma);
    svc = new RequesterCommunicationsService(prisma, validator);

    // A user (for sentBy and content revision author)
    const user = await prisma.user.create({
      data: {
        firstName: 'rc-user',
        lastName: '',
        email: `rc-${Date.now()}@x`,
        password: 'h',
        role: 'DPO',
        approved: true,
      },
    });
    userId = user.id;

    const dsr = await seedDsr(prisma);
    dsrId = dsr.id;
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await module.close();
  });

  afterEach(async () => {
    await prisma.requesterCommunication.deleteMany();
    await prisma.followUpTimeline.deleteMany();
    await prisma.followUpContentRevision.deleteMany();
  });

  // Test 1: record inserts row + emits Timeline NOTIFICATION_SENT event
  it('record inserts a RequesterCommunication row and emits a NOTIFICATION_SENT Timeline event', async () => {
    const sentAt = new Date('2026-03-01T10:00:00.000Z');
    const communication = await svc.record({
      dsrId,
      kind: 'ACKNOWLEDGEMENT',
      sentAt,
      channel: 'EMAIL',
    });

    expect(communication.dsrId).toBe(dsrId);
    expect(communication.kind).toBe('ACKNOWLEDGEMENT');
    expect(communication.channel).toBe('EMAIL');
    expect(communication.sentAt).toEqual(sentAt);

    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'DSR', entityId: dsrId },
    });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('NOTIFICATION_SENT');
    expect(events[0].entityType).toBe('DSR');
    expect(events[0].entityId).toBe(dsrId);
  });

  // Test 2: record with each RequesterCommunicationKind enum value successfully inserts
  it.each<RequesterCommunicationKind>([
    'ACKNOWLEDGEMENT',
    'EXTENSION_NOTICE',
    'CLARIFICATION_REQUEST',
    'RESPONSE',
    'REJECTION',
    'WITHDRAWAL_CONFIRMATION',
  ])('record succeeds for kind=%s', async kind => {
    const communication = await svc.record({
      dsrId,
      kind,
      sentAt: new Date(),
      channel: 'EMAIL',
    });

    expect(communication.kind).toBe(kind);
    expect(communication.dsrId).toBe(dsrId);

    // Clean up between iterations
    await prisma.requesterCommunication.deleteMany();
    await prisma.followUpTimeline.deleteMany();
  });

  // Test 3: list returns ASC by sentAt then id
  it('list returns communications ordered ASC by sentAt then id', async () => {
    const earlier = new Date('2026-01-10T09:00:00.000Z');
    const later = new Date('2026-01-10T11:00:00.000Z');
    const shared = new Date('2026-01-10T10:00:00.000Z');

    // Insert in non-chronological order
    const c2 = await prisma.requesterCommunication.create({
      data: {
        dsrId,
        kind: 'EXTENSION_NOTICE',
        sentAt: later,
        channel: 'POSTAL',
      },
    });
    const c1 = await prisma.requesterCommunication.create({
      data: {
        dsrId,
        kind: 'ACKNOWLEDGEMENT',
        sentAt: earlier,
        channel: 'EMAIL',
      },
    });
    // Two rows with same sentAt to verify secondary sort by id
    const ca = await prisma.requesterCommunication.create({
      data: {
        dsrId,
        kind: 'CLARIFICATION_REQUEST',
        sentAt: shared,
        channel: 'EMAIL',
      },
    });
    const cb = await prisma.requesterCommunication.create({
      data: {
        dsrId,
        kind: 'RESPONSE',
        sentAt: shared,
        channel: 'EMAIL',
      },
    });

    const results = await svc.list(dsrId);
    expect(results).toHaveLength(4);

    // First item: earliest sentAt
    expect(results[0].id).toBe(c1.id);
    // Last item: latest sentAt
    expect(results[3].id).toBe(c2.id);

    // The two shared-date items sorted by id
    const sharedResults = results.slice(1, 3);
    const sharedIds = sharedResults.map(r => r.id);
    if (ca.id < cb.id) {
      expect(sharedIds[0]).toBe(ca.id);
      expect(sharedIds[1]).toBe(cb.id);
    } else {
      expect(sharedIds[0]).toBe(cb.id);
      expect(sharedIds[1]).toBe(ca.id);
    }
  });

  // Test 4: record with valid contentRevisionId succeeds
  it('record with a valid contentRevisionId links to the content revision', async () => {
    // Seed a FollowUpContentRevision for the DSR
    const revision = await prisma.followUpContentRevision.create({
      data: {
        entityType: 'DSR',
        entityId: dsrId,
        field: 'REQUESTER_RESPONSE',
        version: 1,
        content: 'Dear Jane Doe, we acknowledge your request.',
        authorId: userId,
      },
    });

    const communication = await svc.record({
      dsrId,
      kind: 'RESPONSE',
      sentAt: new Date(),
      channel: 'EMAIL',
      contentRevisionId: revision.id,
    });

    expect(communication.contentRevisionId).toBe(revision.id);
  });

  // Test 5: record with non-existent contentRevisionId fails with BadRequest (#9 same-DSR check)
  it('record with a non-existent contentRevisionId throws BadRequestException', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await expect(
      svc.record({
        dsrId,
        kind: 'RESPONSE',
        sentAt: new Date(),
        channel: 'EMAIL',
        contentRevisionId: fakeId,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // Test 6 (#9): record rejects a contentRevisionId that points to a different DSR
  it('rejects a contentRevisionId that points to a different DSR', async () => {
    const dsrB = await seedDsr(prisma, { requesterEmail: 'someone-else@example.test' });
    const cr = await prisma.followUpContentRevision.create({
      data: {
        entityType: 'DSR',
        entityId: dsrB.id,
        field: 'REQUESTER_RESPONSE',
        version: 1,
        content: '...',
        authorId: userId,
      },
    });

    await expect(
      svc.record({
        dsrId,
        kind: 'RESPONSE',
        sentAt: new Date(),
        channel: 'EMAIL',
        contentRevisionId: cr.id,
        sentBy: userId,
      }),
    ).rejects.toThrow(/contentRevisionId does not belong/);
  });
});
