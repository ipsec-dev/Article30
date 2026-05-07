import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationService } from '../../src/modules/organization/organization.service';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

describe('OrganizationService', () => {
  let module: TestingModule;
  let service: OrganizationService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        OrganizationService,
        // Stub: this spec covers get()/update() only — neither path writes
        // an audit row, so a no-op is sufficient.
        { provide: AuditLogService, useValue: { create: async () => undefined } },
      ],
    }).compile();

    service = module.get(OrganizationService);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('get()', () => {
    it('returns null when no organization exists (no write side-effect on read)', async () => {
      const org = await service.get();
      expect(org).toBeNull();
      const count = await prisma.organization.count();
      expect(count).toBe(0);
    });

    it('returns the existing organization', async () => {
      await prisma.organization.create({
        data: { slug: 'existing-corp', companyName: 'Existing Corp' },
      });

      const org = await service.get();

      expect(org?.companyName).toBe('Existing Corp');

      const count = await prisma.organization.count();
      expect(count).toBe(1);
    });
  });

  describe('update()', () => {
    it('updates organization fields', async () => {
      await prisma.organization.create({ data: { slug: 'test-org' } });

      const updated = await service.update({
        companyName: 'Updated Corp',
        dpoName: 'Alice DPO',
        dpoEmail: 'dpo@example.com',
      });

      expect(updated.companyName).toBe('Updated Corp');
      expect(updated.dpoName).toBe('Alice DPO');
      expect(updated.dpoEmail).toBe('dpo@example.com');
    });

    it('creates org first if none exists, then updates', async () => {
      // No org seeded — update should auto-create via get()
      const updated = await service.update({ companyName: 'Auto Created Corp' });

      expect(updated.companyName).toBe('Auto Created Corp');
      expect(updated.id).toBeDefined();
    });
  });

  describe('Organization upgrade — slug + locale + timestamps', () => {
    it('exposes slug, locale, createdAt, updatedAt on every organization', async () => {
      const existing = await prisma.organization.findFirst();
      let org = existing;
      if (!org) {
        org = await prisma.organization.create({
          data: { slug: `seed-${Date.now()}` },
        });
      }
      expect(org.slug).toMatch(/^[a-z0-9-]+$/);
      expect(org.locale).toBe('fr');
      expect(org.createdAt).toBeInstanceOf(Date);
      expect(org.updatedAt).toBeInstanceOf(Date);
    });

    it('enforces unique slug', async () => {
      const a = await prisma.organization.create({
        data: { slug: `unique-${Date.now()}-a` },
      });
      await expect(prisma.organization.create({ data: { slug: a.slug } })).rejects.toThrow(
        /Unique constraint/i,
      );
    });
  });
});
