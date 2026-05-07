import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Severity } from '@article30/shared';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { CommentsService } from '../../src/modules/follow-up/comments.service';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';

describe('CommentsService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: CommentsService;
  let userId: string;
  let violationId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
    const validator = new EntityValidator(prisma);
    const timeline = new TimelineService(prisma, validator);
    svc = new CommentsService(prisma, validator, timeline);

    const org = await prisma.organization.create({ data: { slug: `cm-${Date.now()}` } });
    const user = await prisma.user.create({
      data: {
        firstName: 'cm',
        lastName: '',
        email: `cm-${Date.now()}@x`,
        password: 'h',
        role: 'DPO',
        approved: true,
      },
    });
    userId = user.id;
    const violation = await prisma.violation.create({
      data: {
        title: 'cm-target',
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
    await prisma.followUpComment.deleteMany();
    await prisma.followUpTimeline.deleteMany();
  });

  it('creates a comment AND emits a Timeline COMMENT event in one transaction', async () => {
    const c = await svc.create({
      entityType: 'VIOLATION',
      entityId: violationId,
      authorId: userId,
      body: 'Looks contained.',
      visibility: 'INTERNAL',
    });
    expect(c.body).toBe('Looks contained.');
    expect(c.visibility).toBe('INTERNAL');

    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'VIOLATION', entityId: violationId, kind: 'COMMENT' },
    });
    expect(events).toHaveLength(1);
    expect(events[0].performedBy).toBe(userId);
  });

  it('list filters out INTERNAL comments when visibility=AUDITOR_VISIBLE is requested', async () => {
    await svc.create({
      entityType: 'VIOLATION',
      entityId: violationId,
      authorId: userId,
      body: 'Internal note',
      visibility: 'INTERNAL',
    });
    await svc.create({
      entityType: 'VIOLATION',
      entityId: violationId,
      authorId: userId,
      body: 'Auditor-visible note',
      visibility: 'AUDITOR_VISIBLE',
    });

    const all = await svc.list('VIOLATION', violationId, { visibility: 'ALL' });
    expect(all).toHaveLength(2);

    const auditorOnly = await svc.list('VIOLATION', violationId, {
      visibility: 'AUDITOR_VISIBLE',
    });
    expect(auditorOnly).toHaveLength(1);
    expect(auditorOnly[0].body).toBe('Auditor-visible note');
  });

  it('list returns comments in chronological-desc order', async () => {
    await svc.create({
      entityType: 'VIOLATION',
      entityId: violationId,
      authorId: userId,
      body: 'first',
      visibility: 'INTERNAL',
    });
    await svc.create({
      entityType: 'VIOLATION',
      entityId: violationId,
      authorId: userId,
      body: 'second',
      visibility: 'INTERNAL',
    });
    const list = await svc.list('VIOLATION', violationId, { visibility: 'ALL' });
    expect(list[0].body).toBe('second');
    expect(list[1].body).toBe('first');
  });

  it('rejects forged-FK writes (random UUID for entityId)', async () => {
    const fakeId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
    await expect(
      svc.create({
        entityType: 'VIOLATION',
        entityId: fakeId,
        authorId: userId,
        body: 'forged',
        visibility: 'INTERNAL',
      }),
    ).rejects.toThrow(/not found/i);
  });
});
