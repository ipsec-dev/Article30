import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { DpaStatus, Role, VALIDATE_ROLES } from '@article30/shared';
import { VendorsService } from '../../src/modules/vendors/vendors.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const TREATMENT_HR = 'HR Processing';
const TREATMENT_MARKETING = 'Marketing';

describe('VendorsService', () => {
  let module: TestingModule;
  let service: VendorsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [VendorsService],
    }).compile();

    service = module.get(VendorsService);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await module.close();
  });

  async function seedUser(overrides: { email?: string; role?: Role } = {}) {
    const hashedPassword = await bcrypt.hash('password', BCRYPT_ROUNDS);
    return prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: overrides.email ?? 'user@example.com',
        password: hashedPassword,
        role: overrides.role ?? Role.ADMIN,
        approved: true,
      },
    });
  }

  async function seedTreatment(userId: string, name = 'Test Treatment') {
    return prisma.treatment.create({
      data: {
        name,
        createdBy: userId,
      },
    });
  }

  describe('create', () => {
    it('creates a vendor', async () => {
      const user = await seedUser();

      const vendor = await service.create(
        {
          name: 'Acme Cloud',
          contactEmail: 'contact@acme.com',
          country: 'FR',
          dpaStatus: DpaStatus.SIGNED,
        },
        user.id,
      );

      expect(vendor.name).toBe('Acme Cloud');
      expect(vendor.contactEmail).toBe('contact@acme.com');
      expect(vendor.country).toBe('FR');
      expect(vendor.createdBy).toBe(user.id);
    });

    it('creates a vendor with treatment links', async () => {
      const user = await seedUser();
      const treatment1 = await seedTreatment(user.id, TREATMENT_HR);
      const treatment2 = await seedTreatment(user.id, TREATMENT_MARKETING);

      const vendor = await service.create(
        {
          name: 'Data Corp',
          treatmentIds: [treatment1.id, treatment2.id],
        },
        user.id,
      );

      expect(vendor.treatments).toHaveLength(2);
      const treatmentNames = vendor.treatments.map(
        (t: { treatment: { name: string } }) => t.treatment.name,
      );
      expect(treatmentNames).toContain(TREATMENT_HR);
      expect(treatmentNames).toContain(TREATMENT_MARKETING);
    });
  });

  describe('update', () => {
    it('updates vendor and replaces treatment links', async () => {
      const user = await seedUser();
      const treatment1 = await seedTreatment(user.id, TREATMENT_HR);
      const treatment2 = await seedTreatment(user.id, TREATMENT_MARKETING);
      const treatment3 = await seedTreatment(user.id, 'Analytics');

      const vendor = await service.create(
        {
          name: 'Data Corp',
          treatmentIds: [treatment1.id, treatment2.id],
        },
        user.id,
      );

      const updated = await service.update(vendor.id, {
        name: 'Data Corp v2',
        treatmentIds: [treatment3.id],
      });

      expect(updated.name).toBe('Data Corp v2');
      expect(updated.treatments).toHaveLength(1);
      expect(updated.treatments[0].treatment.name).toBe('Analytics');
    });
  });

  describe('findOne', () => {
    it('finds vendor with sub-processors', async () => {
      const user = await seedUser();

      const parent = await service.create({ name: 'Parent Corp', country: 'DE' }, user.id);

      await service.create(
        {
          name: 'Sub Processor 1',
          isSubProcessor: true,
          parentVendorId: parent.id,
        },
        user.id,
      );

      const found = await service.findOne(parent.id);

      expect(found.name).toBe('Parent Corp');
      expect(found.subProcessors).toHaveLength(1);
      expect(found.subProcessors[0].name).toBe('Sub Processor 1');
    });
  });

  describe('delete', () => {
    it('deletes vendor and cascades to VendorTreatment', async () => {
      const user = await seedUser();
      const treatment = await seedTreatment(user.id, TREATMENT_HR);

      const vendor = await service.create(
        {
          name: 'To Delete',
          treatmentIds: [treatment.id],
        },
        user.id,
      );

      await service.delete(vendor.id);

      // Vendor should be gone
      await expect(service.findOne(vendor.id)).rejects.toThrow(NotFoundException);

      // VendorTreatment links should be gone
      const links = await prisma.vendorTreatment.findMany({
        where: { vendorId: vendor.id },
      });
      expect(links).toHaveLength(0);
    });
  });
});

describe('VALIDATE_ROLES constant', () => {
  it('includes ADMIN and DPO exactly', () => {
    expect([...VALIDATE_ROLES].sort()).toEqual([Role.ADMIN, Role.DPO].sort());
  });
});
