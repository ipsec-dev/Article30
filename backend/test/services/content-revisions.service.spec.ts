import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Severity } from '@article30/shared';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { ContentRevisionsService } from '../../src/modules/follow-up/content-revisions.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';

describe('ContentRevisionsService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: ContentRevisionsService;
  let userId: string;
  let violationId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
    svc = new ContentRevisionsService(prisma, new EntityValidator(prisma));

    await prisma.organization.create({ data: { slug: `cr-${Date.now()}` } });
    const user = await prisma.user.create({
      data: {
        firstName: 'cr',
        lastName: '',
        email: `cr-${Date.now()}@x`,
        password: 'h',
        role: 'DPO',
        approved: true,
      },
    });
    userId = user.id;
    const violation = await prisma.violation.create({
      data: {
        title: 'cr-target',
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
    await prisma.followUpContentRevision.deleteMany();
  });

  it('first save creates version 1', async () => {
    const r = await svc.save({
      entityType: 'VIOLATION',
      entityId: violationId,
      field: 'CNIL_FILING_DRAFT',
      content: 'Initial draft',
      authorId: userId,
    });
    expect(r.version).toBe(1);
    expect(r.content).toBe('Initial draft');
  });

  it('subsequent saves increment version per (entity, field)', async () => {
    await svc.save({
      entityType: 'VIOLATION',
      entityId: violationId,
      field: 'CNIL_FILING_DRAFT',
      content: 'v1',
      authorId: userId,
    });
    const v2 = await svc.save({
      entityType: 'VIOLATION',
      entityId: violationId,
      field: 'CNIL_FILING_DRAFT',
      content: 'v2',
      authorId: userId,
    });
    expect(v2.version).toBe(2);

    // Different field starts back at v1.
    const otherField = await svc.save({
      entityType: 'VIOLATION',
      entityId: violationId,
      field: 'PERSONS_NOTIFICATION_BODY',
      content: 'first persons-notif',
      authorId: userId,
    });
    expect(otherField.version).toBe(1);
  });

  it('latest returns the highest-version row for the (entity, field) tuple', async () => {
    await svc.save({
      entityType: 'VIOLATION',
      entityId: violationId,
      field: 'CNIL_FILING_DRAFT',
      content: 'v1',
      authorId: userId,
    });
    await svc.save({
      entityType: 'VIOLATION',
      entityId: violationId,
      field: 'CNIL_FILING_DRAFT',
      content: 'v2',
      authorId: userId,
    });
    const latest = await svc.latest('VIOLATION', violationId, 'CNIL_FILING_DRAFT');
    expect(latest?.version).toBe(2);
    expect(latest?.content).toBe('v2');
  });

  it('latest returns null when no revision exists', async () => {
    const latest = await svc.latest('VIOLATION', violationId, 'CNIL_FILING_DRAFT');
    expect(latest).toBeNull();
  });

  it('history returns all versions ascending by version', async () => {
    await svc.save({
      entityType: 'VIOLATION',
      entityId: violationId,
      field: 'CNIL_FILING_DRAFT',
      content: 'a',
      authorId: userId,
    });
    await svc.save({
      entityType: 'VIOLATION',
      entityId: violationId,
      field: 'CNIL_FILING_DRAFT',
      content: 'b',
      authorId: userId,
    });
    await svc.save({
      entityType: 'VIOLATION',
      entityId: violationId,
      field: 'CNIL_FILING_DRAFT',
      content: 'c',
      authorId: userId,
    });
    const history = await svc.history('VIOLATION', violationId, 'CNIL_FILING_DRAFT');
    expect(history.map(r => r.version)).toEqual([1, 2, 3]);
    expect(history.map(r => r.content)).toEqual(['a', 'b', 'c']);
  });
});
