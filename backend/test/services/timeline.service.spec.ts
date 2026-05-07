import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Severity } from '@article30/shared';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';

describe('TimelineService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: TimelineService;
  let userId: string;
  let violationId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
    svc = new TimelineService(prisma, new EntityValidator(prisma));

    const org = await prisma.organization.create({ data: { slug: `tl-${Date.now()}` } });
    const user = await prisma.user.create({
      data: {
        firstName: 'tl',
        lastName: '',
        email: `tl-${Date.now()}@x`,
        password: 'h',
        role: 'AUDITOR',
        approved: true,
      },
    });
    userId = user.id;
    const violation = await prisma.violation.create({
      data: {
        title: 'tl-target',
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
    await prisma.followUpTimeline.deleteMany();
  });

  it('records a timeline event for a real entity in the right org', async () => {
    const event = await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'STATUS_CHANGE',
      payload: { from: 'DETECTED', to: 'ASSESSED' },
      performedBy: userId,
    });
    expect(event.id).toBeDefined();
    expect(event.kind).toBe('STATUS_CHANGE');
  });

  it('rejects forged-FK writes (random UUID for entityId)', async () => {
    const fakeId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
    await expect(
      svc.record({
        entityType: 'VIOLATION',
        entityId: fakeId,
        kind: 'STATUS_CHANGE',
        payload: {},
        performedBy: userId,
      }),
    ).rejects.toThrow(/not found/i);
  });

  it('lists events for an entity in chronological-desc order', async () => {
    await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'STATUS_CHANGE',
      payload: { n: 1 },
      performedBy: userId,
    });
    await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'COMMENT',
      payload: { n: 2 },
      performedBy: userId,
    });
    const list = await svc.list('VIOLATION', violationId);
    expect(list).toHaveLength(2);
    expect(list[0].kind).toBe('COMMENT'); // newest first
    expect(list[1].kind).toBe('STATUS_CHANGE');
  });
});
