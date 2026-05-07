import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Severity } from '@article30/shared';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { DecisionsService } from '../../src/modules/follow-up/decisions.service';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';

describe('DecisionsService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: DecisionsService;
  let userId: string;
  let violationId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
    const validator = new EntityValidator(prisma);
    const timeline = new TimelineService(prisma, validator);
    svc = new DecisionsService(prisma, validator, timeline);

    const org = await prisma.organization.create({ data: { slug: `dc-${Date.now()}` } });
    const user = await prisma.user.create({
      data: {
        firstName: 'dc',
        lastName: '',
        email: `dc-${Date.now()}@x`,
        password: 'h',
        role: 'DPO',
        approved: true,
      },
    });
    userId = user.id;
    const violation = await prisma.violation.create({
      data: {
        title: 'dc-target',
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
    await prisma.followUpDecision.deleteMany();
    await prisma.followUpTimeline.deleteMany();
  });

  it('records a decision and emits a Timeline DECISION event', async () => {
    const d = await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'NOTIFY_CNIL',
      outcome: { decision: 'YES', phase: 'INITIAL' },
      rationale: 'High likelihood of harm to data subjects.',
      inputsSnapshot: { riskLevel: 'HIGH' },
      decidedBy: userId,
    });
    expect(d.id).toBeDefined();
    expect(d.kind).toBe('NOTIFY_CNIL');
    expect(d.supersededByDecisionId).toBeNull();
    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'VIOLATION', entityId: violationId, kind: 'DECISION' },
    });
    expect(events).toHaveLength(1);
  });

  it('subsequent decisions of the same kind link the previous as supersededBy', async () => {
    const first = await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'NOTIFY_CNIL',
      outcome: { decision: 'NO' },
      rationale: 'low risk early read',
      inputsSnapshot: {},
      decidedBy: userId,
    });
    const second = await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'NOTIFY_CNIL',
      outcome: { decision: 'YES' },
      rationale: 'reassessed after triage',
      inputsSnapshot: {},
      decidedBy: userId,
    });
    const refreshed = await prisma.followUpDecision.findUniqueOrThrow({ where: { id: first.id } });
    expect(refreshed.supersededByDecisionId).toBe(second.id);
    expect(second.supersededByDecisionId).toBeNull();
  });

  it('decisions of different kinds do not supersede each other', async () => {
    const cnil = await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'NOTIFY_CNIL',
      outcome: { decision: 'YES' },
      rationale: 'cnil decision',
      inputsSnapshot: {},
      decidedBy: userId,
    });
    const dismiss = await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'DISMISS_BREACH',
      outcome: { decision: 'NO' },
      rationale: 'not a dismissal',
      inputsSnapshot: {},
      decidedBy: userId,
    });
    const refreshedCnil = await prisma.followUpDecision.findUniqueOrThrow({
      where: { id: cnil.id },
    });
    expect(refreshedCnil.supersededByDecisionId).toBeNull();
    expect(dismiss.supersededByDecisionId).toBeNull();
  });

  it('only the latest non-superseded decision of a kind is the supersedes target', async () => {
    const first = await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'NOTIFY_CNIL',
      outcome: { decision: 'NO' },
      rationale: 'first',
      inputsSnapshot: {},
      decidedBy: userId,
    });
    const second = await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'NOTIFY_CNIL',
      outcome: { decision: 'YES' },
      rationale: 'second',
      inputsSnapshot: {},
      decidedBy: userId,
    });
    const third = await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'NOTIFY_CNIL',
      outcome: { decision: 'YES' },
      rationale: 'third confirms',
      inputsSnapshot: {},
      decidedBy: userId,
    });
    // first → superseded by second; second → superseded by third; third → null
    const refreshedFirst = await prisma.followUpDecision.findUniqueOrThrow({
      where: { id: first.id },
    });
    const refreshedSecond = await prisma.followUpDecision.findUniqueOrThrow({
      where: { id: second.id },
    });
    const refreshedThird = await prisma.followUpDecision.findUniqueOrThrow({
      where: { id: third.id },
    });
    expect(refreshedFirst.supersededByDecisionId).toBe(second.id);
    expect(refreshedSecond.supersededByDecisionId).toBe(third.id);
    expect(refreshedThird.supersededByDecisionId).toBeNull();
  });

  it('list returns decisions in chronological-asc order', async () => {
    await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'DISMISS_BREACH',
      outcome: { decision: 'NO' },
      rationale: 'first',
      inputsSnapshot: {},
      decidedBy: userId,
    });
    await svc.record({
      entityType: 'VIOLATION',
      entityId: violationId,
      kind: 'DISMISS_BREACH',
      outcome: { decision: 'YES' },
      rationale: 'second',
      inputsSnapshot: {},
      decidedBy: userId,
    });
    const list = await svc.list('VIOLATION', violationId);
    expect(list).toHaveLength(2);
    expect(list[0].rationale).toBe('first');
    expect(list[0].supersededByDecisionId).toBeTruthy();
    expect(list[1].rationale).toBe('second');
    expect(list[1].supersededByDecisionId).toBeNull();
  });
});
