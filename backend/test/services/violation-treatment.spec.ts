import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Severity } from '@article30/shared';
import { ViolationsService } from '../../src/modules/violations/violations.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';
import { DecisionsService } from '../../src/modules/follow-up/decisions.service';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { BreachNotificationsService } from '../../src/modules/violations/breach-notifications.service';
import { noopNotificationService } from '../helpers/notification-stub';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const TREATMENT_A = 'Treatment A';
const TREATMENT_B = 'Treatment B';

describe('ViolationsService – treatment linking', () => {
  let module: TestingModule;
  let service: ViolationsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    prisma = module.get(PrismaService);
    const validator = new EntityValidator(prisma);
    const timeline = new TimelineService(prisma, validator);
    const decisions = new DecisionsService(prisma, validator, timeline);
    const breachNotifications = new BreachNotificationsService(prisma, validator, timeline);
    // create() emits notifications, but this spec asserts only treatment
    // linking — a no-op stub keeps the test focused.
    const notifications = noopNotificationService();
    service = new ViolationsService(
      prisma,
      validator,
      decisions,
      breachNotifications,
      notifications,
    );
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await module.close();
  });

  async function seedUser(overrides: { email?: string; name?: string } = {}) {
    const hashedPassword = await bcrypt.hash('password', BCRYPT_ROUNDS);
    return prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: overrides.email ?? 'user@example.com',
        password: hashedPassword,
        role: 'ADMIN',
        approved: true,
      },
    });
  }

  async function seedTreatment(userId: string, name: string) {
    return prisma.treatment.create({
      data: {
        name,
        createdBy: userId,
      },
    });
  }

  describe('create() – with treatmentIds', () => {
    it('creates a violation linked to treatments', async () => {
      const user = await seedUser();
      const t1 = await seedTreatment(user.id, TREATMENT_A);
      const t2 = await seedTreatment(user.id, TREATMENT_B);

      const violation = await service.create(
        {
          title: 'Breach with treatments',
          severity: Severity.HIGH,
          discoveredAt: '2026-03-01T00:00:00.000Z',
          treatmentIds: [t1.id, t2.id],
        },
        user.id,
      );

      expect(violation.treatments).toHaveLength(2);
      const treatmentNames = violation.treatments
        .map((vt: { treatment: { name: string } }) => vt.treatment.name)
        .sort();
      expect(treatmentNames).toEqual([TREATMENT_A, TREATMENT_B]);
    });

    it('creates a violation without treatment links', async () => {
      const user = await seedUser();

      const violation = await service.create(
        {
          title: 'Standalone breach',
          severity: Severity.LOW,
          discoveredAt: '2026-03-15T00:00:00.000Z',
        },
        user.id,
      );

      expect(violation.treatments).toHaveLength(0);
    });
  });

  describe('update() – treatment links', () => {
    it('updates treatment links on a violation (replace old links with new)', async () => {
      const user = await seedUser();
      const t1 = await seedTreatment(user.id, TREATMENT_A);
      const t2 = await seedTreatment(user.id, TREATMENT_B);
      const t3 = await seedTreatment(user.id, 'Treatment C');

      const violation = await service.create(
        {
          title: 'Link update test',
          severity: Severity.MEDIUM,
          discoveredAt: '2026-04-01T00:00:00.000Z',
          treatmentIds: [t1.id, t2.id],
        },
        user.id,
      );

      expect(violation.treatments).toHaveLength(2);

      const updated = await service.update(violation.id, {
        treatmentIds: [t2.id, t3.id],
      });

      expect(updated.treatments).toHaveLength(2);
      const updatedNames = updated.treatments
        .map((vt: { treatment: { name: string } }) => vt.treatment.name)
        .sort();
      expect(updatedNames).toEqual([TREATMENT_B, 'Treatment C']);
    });
  });

  describe('findOne() – linked treatments', () => {
    it('includes linked treatments in result', async () => {
      const user = await seedUser();
      const t1 = await seedTreatment(user.id, 'Treatment X');

      const created = await service.create(
        {
          title: 'Findable violation',
          severity: Severity.CRITICAL,
          discoveredAt: '2026-02-01T00:00:00.000Z',
          treatmentIds: [t1.id],
        },
        user.id,
      );

      const found = await service.findOne(created.id);

      expect(found.treatments).toHaveLength(1);
      expect(found.treatments[0].treatment.id).toBe(t1.id);
      expect(found.treatments[0].treatment.name).toBe('Treatment X');
    });
  });
});
