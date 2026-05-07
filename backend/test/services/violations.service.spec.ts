import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
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
const EXPECTED_COUNT = 3;
const DATE_JAN_01 = '2026-01-01T00:00:00.000Z';

describe('ViolationsService', () => {
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
    // create() emits notifications, but this spec asserts only the persisted
    // violation row — a no-op stub keeps the test focused.
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

  describe('create()', () => {
    it('creates violation with correct fields and date conversion', async () => {
      const user = await seedUser();
      const discoveredAt = '2026-01-15T10:00:00.000Z';

      const violation = await service.create(
        {
          discoveredAt,
          title: 'Data Breach',
          description: 'Unauthorized access detected',
          severity: Severity.HIGH,
        },
        user.id,
      );

      expect(violation.title).toBe('Data Breach');
      expect(violation.description).toBe('Unauthorized access detected');
      expect(violation.severity).toBe(Severity.HIGH);
      expect(violation.awarenessAt).toBeInstanceOf(Date);
      expect(violation.awarenessAt.toISOString()).toBe(discoveredAt);
      expect(violation.createdBy).toBe(user.id);
    });
  });

  describe('findAll()', () => {
    it('returns paginated results with creator info', async () => {
      const user = await seedUser();
      await service.create(
        { title: 'V1', severity: Severity.LOW, discoveredAt: DATE_JAN_01 },
        user.id,
      );
      await service.create(
        { title: 'V2', severity: Severity.MEDIUM, discoveredAt: '2026-01-02T00:00:00.000Z' },
        user.id,
      );
      await service.create(
        { title: 'V3', severity: Severity.HIGH, discoveredAt: '2026-01-03T00:00:00.000Z' },
        user.id,
      );

      const result = await service.findAll(1, 2);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(EXPECTED_COUNT);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.data[0].creator).toBeDefined();
      expect(result.data[0].creator.id).toBe(user.id);
      expect(`${result.data[0].creator.firstName} ${result.data[0].creator.lastName}`).toBe(
        'Test User',
      );
    });
  });

  describe('findOne()', () => {
    it('returns violation with creator info', async () => {
      const user = await seedUser();
      const created = await service.create(
        {
          title: 'Single Violation',
          severity: Severity.CRITICAL,
          discoveredAt: '2026-02-01T00:00:00.000Z',
        },
        user.id,
      );

      const found = await service.findOne(created.id);

      expect(found.id).toBe(created.id);
      expect(found.title).toBe('Single Violation');
      expect(found.creator).toBeDefined();
      expect(found.creator.id).toBe(user.id);
    });

    it('throws NotFoundException for unknown id', async () => {
      await expect(service.findOne('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update()', () => {
    it('updates violation fields', async () => {
      const user = await seedUser();
      const created = await service.create(
        {
          title: 'Original Title',
          severity: Severity.LOW,
          discoveredAt: DATE_JAN_01,
        },
        user.id,
      );

      const updated = await service.update(created.id, {
        title: 'Updated Title',
        severity: Severity.CRITICAL,
        remediation: 'Patch applied',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.severity).toBe(Severity.CRITICAL);
      expect(updated.remediation).toBe('Patch applied');
    });

    it('handles discoveredAt date conversion (stored as awarenessAt)', async () => {
      const user = await seedUser();
      const created = await service.create(
        { title: 'Date Test', severity: Severity.MEDIUM, discoveredAt: DATE_JAN_01 },
        user.id,
      );

      const newDiscoveredAt = '2026-03-20T12:00:00.000Z';
      const updated = await service.update(created.id, { discoveredAt: newDiscoveredAt });

      expect(updated.awarenessAt).toBeInstanceOf(Date);
      expect(updated.awarenessAt.toISOString()).toBe(newDiscoveredAt);
    });
  });
});
