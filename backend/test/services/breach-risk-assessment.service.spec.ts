import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Severity } from '@article30/shared';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { BreachRiskAssessmentService } from '../../src/modules/violations/breach-risk-assessment.service';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';

describe('BreachRiskAssessmentService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: BreachRiskAssessmentService;
  let userId: string;
  let violationId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
    const validator = new EntityValidator(prisma);
    const timeline = new TimelineService(prisma, validator);
    svc = new BreachRiskAssessmentService(prisma, validator, timeline);

    const org = await prisma.organization.create({ data: { slug: `bra-${Date.now()}` } });
    const user = await prisma.user.create({
      data: {
        firstName: 'bra',
        lastName: '',
        email: `bra-${Date.now()}@x`,
        password: 'h',
        role: 'DPO',
        approved: true,
      },
    });
    userId = user.id;
    const violation = await prisma.violation.create({
      data: {
        title: 'bra-target',
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
    await prisma.breachRiskAssessment.deleteMany();
    await prisma.followUpTimeline.deleteMany();
  });

  it('first create produces no supersedesId and emits a Timeline event', async () => {
    const r = await svc.create({
      violationId,
      likelihood: 'MEDIUM',
      severity: 'HIGH',
      affectedDataCategories: ['identifiers', 'financial'],
      crossBorder: false,
      potentialConsequences: 'Identity theft risk for affected users',
      assessedBy: userId,
    });
    expect(r.supersedesId).toBeNull();
    expect(r.computedRiskLevel).toBe('HIGH');
    expect(r.affectedDataCategories).toEqual(['identifiers', 'financial']);

    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'VIOLATION', entityId: violationId },
    });
    expect(events).toHaveLength(1);
  });

  it('second create supersedes the first via supersedesId link', async () => {
    const first = await svc.create({
      violationId,
      likelihood: 'LOW',
      severity: 'LOW',
      affectedDataCategories: ['identifiers'],
      crossBorder: false,
      potentialConsequences: 'Low risk after initial review',
      assessedBy: userId,
    });
    const second = await svc.create({
      violationId,
      likelihood: 'HIGH',
      severity: 'HIGH',
      affectedDataCategories: ['identifiers', 'health'],
      crossBorder: true,
      potentialConsequences: 'Reassessed after forensic analysis',
      mitigatingFactors: 'Encryption was partially in place',
      assessedBy: userId,
    });
    expect(second.supersedesId).toBe(first.id);
    expect(first.supersedesId).toBeNull();
    expect(second.computedRiskLevel).toBe('HIGH');
  });

  it('current returns the latest non-superseded assessment', async () => {
    await svc.create({
      violationId,
      likelihood: 'LOW',
      severity: 'LOW',
      affectedDataCategories: ['identifiers'],
      crossBorder: false,
      potentialConsequences: 'first assessment text body',
      assessedBy: userId,
    });
    await svc.create({
      violationId,
      likelihood: 'HIGH',
      severity: 'MEDIUM',
      affectedDataCategories: ['identifiers'],
      crossBorder: false,
      potentialConsequences: 'reassessed after additional evidence surfaced',
      assessedBy: userId,
    });
    const head = await svc.current(violationId);
    expect(head?.likelihood).toBe('HIGH');
    expect(head?.computedRiskLevel).toBe('HIGH');
  });

  it('history returns all assessments ascending by assessedAt', async () => {
    await svc.create({
      violationId,
      likelihood: 'LOW',
      severity: 'LOW',
      affectedDataCategories: [],
      crossBorder: false,
      potentialConsequences: 'first one for history check',
      assessedBy: userId,
    });
    await svc.create({
      violationId,
      likelihood: 'MEDIUM',
      severity: 'MEDIUM',
      affectedDataCategories: [],
      crossBorder: false,
      potentialConsequences: 'second one for history check',
      assessedBy: userId,
    });
    const hist = await svc.history(violationId);
    expect(hist).toHaveLength(2);
    expect(hist[0].likelihood).toBe('LOW');
    expect(hist[1].likelihood).toBe('MEDIUM');
  });

  it('computedRiskLevel = max(likelihood, severity)', async () => {
    const cases = [
      { likelihood: 'LOW', severity: 'LOW', expected: 'LOW' },
      { likelihood: 'LOW', severity: 'HIGH', expected: 'HIGH' },
      { likelihood: 'HIGH', severity: 'LOW', expected: 'HIGH' },
      { likelihood: 'MEDIUM', severity: 'HIGH', expected: 'HIGH' },
      { likelihood: 'MEDIUM', severity: 'MEDIUM', expected: 'MEDIUM' },
      { likelihood: 'HIGH', severity: 'MEDIUM', expected: 'HIGH' },
    ] as const;
    for (const c of cases) {
      const r = await svc.create({
        violationId,
        likelihood: c.likelihood,
        severity: c.severity,
        affectedDataCategories: [],
        crossBorder: false,
        potentialConsequences: `case ${c.likelihood} ${c.severity}`,
        assessedBy: userId,
      });
      expect(r.computedRiskLevel).toBe(c.expected);
    }
  });
});
