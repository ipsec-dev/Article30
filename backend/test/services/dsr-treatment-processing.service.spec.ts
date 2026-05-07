import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';
import { DsrTreatmentProcessingService } from '../../src/modules/dsr/dsr-treatment-processing.service';
import { seedTreatment, seedDsr } from '../e2e/seed';
import { cleanupDatabase } from '../helpers';

describe('DsrTreatmentProcessingService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: DsrTreatmentProcessingService;

  let userId: string;
  let dsrId: string;
  let treatmentId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
    const validator = new EntityValidator(prisma);
    svc = new DsrTreatmentProcessingService(prisma, validator);

    // A user (creator for treatments)
    const user = await prisma.user.create({
      data: {
        firstName: 'tp-user',
        lastName: '',
        email: `tp-${Date.now()}@x`,
        password: 'h',
        role: 'DPO',
        approved: true,
      },
    });
    userId = user.id;

    // DSR
    const dsr = await seedDsr(prisma);
    dsrId = dsr.id;

    // Treatment
    const treatment = await seedTreatment(prisma, userId);
    treatmentId = treatment.id;
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await module.close();
  });

  afterEach(async () => {
    await prisma.dsrTreatmentProcessingLog.deleteMany();
  });

  // Test 1: link creates a row with default actionTaken: NONE, vendorPropagationStatus: NOT_REQUIRED
  it('link creates a row with default actionTaken NONE and vendorPropagationStatus NOT_REQUIRED', async () => {
    const row = await svc.link(dsrId, treatmentId);

    expect(row.dsrId).toBe(dsrId);
    expect(row.treatmentId).toBe(treatmentId);
    expect(row.actionTaken).toBe('NONE');
    expect(row.vendorPropagationStatus).toBe('NOT_REQUIRED');
    expect(row.searchedAt).toBeNull();
    expect(row.findingsSummary).toBeNull();
    expect(row.actionTakenAt).toBeNull();
    expect(row.performedBy).toBeNull();
  });

  // Test 2: link is idempotent (calling twice returns the existing row, no throw)
  it('link is idempotent — calling twice returns the existing row without error', async () => {
    const first = await svc.link(dsrId, treatmentId);
    const second = await svc.link(dsrId, treatmentId);

    expect(second.dsrId).toBe(first.dsrId);
    expect(second.treatmentId).toBe(first.treatmentId);
    expect(second.createdAt.toISOString()).toBe(first.createdAt.toISOString());

    const count = await prisma.dsrTreatmentProcessingLog.count({
      where: { dsrId, treatmentId },
    });
    expect(count).toBe(1);
  });

  // Test 3: upsert updates findings + actionTaken on an existing row without clearing other fields
  it('upsert updates findings and actionTaken on an existing row without clearing other fields', async () => {
    // Create with link first so searchedAt stays null
    await svc.link(dsrId, treatmentId);

    // Now upsert with partial fields
    const updated = await svc.upsert({
      dsrId,
      treatmentId,
      actionTaken: 'ACCESS_EXPORT',
      vendorPropagationStatus: 'PENDING',
      findingsSummary: 'Exported 3 records.',
    });

    expect(updated.actionTaken).toBe('ACCESS_EXPORT');
    expect(updated.vendorPropagationStatus).toBe('PENDING');
    expect(updated.findingsSummary).toBe('Exported 3 records.');
    // searchedAt was not provided and should remain null (not overwritten)
    expect(updated.searchedAt).toBeNull();
  });

  // Test 4: upsert creates a new row when none exists
  it('upsert creates a new row when none exists', async () => {
    const row = await svc.upsert({
      dsrId,
      treatmentId,
      actionTaken: 'DELETED',
      vendorPropagationStatus: 'PROPAGATED',
      findingsSummary: 'Deleted all data.',
      searchedAt: new Date('2026-01-10T10:00:00Z'),
    });

    expect(row.dsrId).toBe(dsrId);
    expect(row.treatmentId).toBe(treatmentId);
    expect(row.actionTaken).toBe('DELETED');
    expect(row.vendorPropagationStatus).toBe('PROPAGATED');
    expect(row.findingsSummary).toBe('Deleted all data.');
    expect(row.searchedAt).toEqual(new Date('2026-01-10T10:00:00Z'));
  });

  // Test 5: list returns rows for the DSR (and only that DSR)
  it('list returns rows for the DSR, ordered by treatmentId ASC', async () => {
    // Seed a second treatment and a second DSR
    const treatment2 = await seedTreatment(prisma, userId);
    const otherDsr = await seedDsr(prisma);

    await svc.link(dsrId, treatmentId);
    await svc.link(dsrId, treatment2.id);
    // Link other DSR — should NOT appear in list for dsrId
    await svc.link(otherDsr.id, treatmentId);

    const rows = await svc.list(dsrId);
    expect(rows).toHaveLength(2);
    expect(rows.every(r => r.dsrId === dsrId)).toBe(true);

    // Verify stable ASC order by treatmentId
    const ids = rows.map(r => r.treatmentId);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);

    // Cleanup extra rows (afterEach only clears via deleteMany)
    await prisma.dsrTreatmentProcessingLog.deleteMany({ where: { dsrId: otherDsr.id } });
    await prisma.dataSubjectRequest.delete({ where: { id: otherDsr.id } });
    await prisma.treatment.delete({ where: { id: treatment2.id } });
  });

  // Test 6: unlink removes the row
  it('unlink removes the row', async () => {
    await svc.link(dsrId, treatmentId);

    let count = await prisma.dsrTreatmentProcessingLog.count({ where: { dsrId, treatmentId } });
    expect(count).toBe(1);

    await svc.unlink(dsrId, treatmentId);

    count = await prisma.dsrTreatmentProcessingLog.count({ where: { dsrId, treatmentId } });
    expect(count).toBe(0);
  });

  // Bonus: unlink is idempotent (no throw when row doesn't exist)
  it('unlink is idempotent — does not throw when row does not exist', async () => {
    await expect(svc.unlink(dsrId, treatmentId)).resolves.toBeUndefined();
  });
});
