import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Severity } from '@article30/shared';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { RegulatorInteractionsService } from '../../src/modules/violations/regulator-interactions.service';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';

describe('RegulatorInteractionsService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: RegulatorInteractionsService;
  let userId: string;
  let violationId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
    const validator = new EntityValidator(prisma);
    const timeline = new TimelineService(prisma, validator);
    svc = new RegulatorInteractionsService(prisma, validator, timeline);

    const user = await prisma.user.create({
      data: {
        firstName: 'ri-tester',
        lastName: '',
        email: `ri-${Date.now()}@x`,
        password: 'h',
        role: 'DPO',
        approved: true,
      },
    });
    userId = user.id;

    const violation = await prisma.violation.create({
      data: {
        title: 'ri-target',
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
    await prisma.regulatorInteraction.deleteMany({ where: { violationId } });
    await prisma.followUpTimeline.deleteMany({ where: { entityId: violationId } });
  });

  // record

  it('(1) record OUTBOUND/RFI_RESPONDED: creates RegulatorInteraction row + Timeline INTERACTION_LOGGED', async () => {
    const interaction = await svc.record({
      violationId,
      direction: 'OUTBOUND',
      kind: 'RFI_RESPONDED',
      occurredAt: new Date('2026-04-10T10:00:00Z'),
      summary: 'Responded to CNIL request for information about the breach scope',
      recordedBy: userId,
    });

    expect(interaction.direction).toBe('OUTBOUND');
    expect(interaction.kind).toBe('RFI_RESPONDED');
    expect(interaction.violationId).toBe(violationId);

    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'VIOLATION', entityId: violationId },
    });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('INTERACTION_LOGGED');

    const payload = events[0].payload as Record<string, unknown>;
    expect(payload.interactionId).toBe(interaction.id);
    expect(payload.direction).toBe('OUTBOUND');
    expect(payload.kind).toBe('RFI_RESPONDED');
    expect(payload.summary).toBe(
      'Responded to CNIL request for information about the breach scope',
    );
  });

  it('(2) record INBOUND/RFI_RECEIVED: creates RegulatorInteraction row + Timeline INTERACTION_LOGGED event', async () => {
    const interaction = await svc.record({
      violationId,
      direction: 'INBOUND',
      kind: 'RFI_RECEIVED',
      occurredAt: new Date('2026-04-08T09:00:00Z'),
      referenceNumber: 'CNIL-RFI-2026-001',
      summary: 'Received formal request for information from CNIL regarding breach notification',
      recordedBy: userId,
    });

    expect(interaction.direction).toBe('INBOUND');
    expect(interaction.kind).toBe('RFI_RECEIVED');
    expect(interaction.referenceNumber).toBe('CNIL-RFI-2026-001');

    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'VIOLATION', entityId: violationId, kind: 'INTERACTION_LOGGED' },
    });
    expect(events).toHaveLength(1);

    const payload = events[0].payload as Record<string, unknown>;
    expect(payload.interactionId).toBe(interaction.id);
    expect(payload.direction).toBe('INBOUND');
    expect(payload.kind).toBe('RFI_RECEIVED');
  });

  // list

  it('(3) list returns interactions ordered ASC by occurredAt then id', async () => {
    // Insert out of order
    await svc.record({
      violationId,
      direction: 'INBOUND',
      kind: 'CLOSURE_NOTICE',
      occurredAt: new Date('2026-04-20T10:00:00Z'),
      summary: 'Received closure notice from CNIL — case resolved without sanction',
      recordedBy: userId,
    });
    await svc.record({
      violationId,
      direction: 'INBOUND',
      kind: 'RFI_RECEIVED',
      occurredAt: new Date('2026-04-08T09:00:00Z'),
      summary: 'CNIL formal RFI received requesting breach scope details',
      recordedBy: userId,
    });
    await svc.record({
      violationId,
      direction: 'OUTBOUND',
      kind: 'RFI_RESPONDED',
      occurredAt: new Date('2026-04-12T14:00:00Z'),
      summary: 'Submitted detailed response to CNIL RFI',
      recordedBy: userId,
    });

    const interactions = await svc.list(violationId);
    expect(interactions).toHaveLength(3);
    // Verify ascending order by occurredAt
    expect(interactions[0].kind).toBe('RFI_RECEIVED');
    expect(interactions[1].kind).toBe('RFI_RESPONDED');
    expect(interactions[2].kind).toBe('CLOSURE_NOTICE');
    expect(interactions[0].occurredAt.getTime()).toBeLessThanOrEqual(
      interactions[1].occurredAt.getTime(),
    );
    expect(interactions[1].occurredAt.getTime()).toBeLessThanOrEqual(
      interactions[2].occurredAt.getTime(),
    );
  });

  // Optional tx parameter

  it('(4) record with external tx: interaction + timeline committed atomically', async () => {
    let capturedId: string | undefined;

    await prisma.$transaction(async tx => {
      const interaction = await svc.record(
        {
          violationId,
          direction: 'OUTBOUND',
          kind: 'RFI_RESPONDED',
          occurredAt: new Date('2026-04-15T11:00:00Z'),
          summary: 'Tx-composed RFI response to CNIL formal request',
          recordedBy: userId,
        },
        tx,
      );
      capturedId = interaction.id;
    });

    expect(capturedId).toBeDefined();

    const interaction = await prisma.regulatorInteraction.findUnique({
      where: { id: capturedId },
    });
    expect(interaction).not.toBeNull();
    expect(interaction?.kind).toBe('RFI_RESPONDED');

    const event = await prisma.followUpTimeline.findFirst({
      where: { entityId: violationId, kind: 'INTERACTION_LOGGED' },
    });
    expect(event).not.toBeNull();
    const payload = event?.payload as Record<string, unknown>;
    expect(payload.interactionId).toBe(capturedId);
  });
});
