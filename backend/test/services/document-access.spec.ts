import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LinkedEntity, Role } from '@article30/shared';
import { EntityType } from '@prisma/client';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  assertCanReadDocument,
  assertCanReadFollowUpAttachment,
} from '../../src/common/authorization/document-access';
import { cleanupDatabase } from '../helpers';
import type { Document, FollowUpAttachment } from '@prisma/client';
import type { RequestUser } from '../../src/common/types/request-user';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test';

describe('document-access helpers', () => {
  let module: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
  });

  afterEach(() => cleanupDatabase(prisma));
  afterAll(() => module.close());

  function makeUser(role: Role, id = 'user-1'): RequestUser {
    return { id, role, email: `${id}@x.test`, firstName: 'F', lastName: 'L', approved: true };
  }

  async function seedUserRow(role: Role, id = 'user-1') {
    return prisma.user.create({
      data: {
        id,
        firstName: 'F',
        lastName: 'L',
        email: `${id}@x.test`,
        password: 'x',
        role,
        approved: true,
      },
    });
  }

  describe('assertCanReadDocument - TREATMENT', () => {
    it('allows ADMIN regardless of ownership', async () => {
      await seedUserRow(Role.ADMIN, 'admin-1');
      const owner = await seedUserRow(Role.PROCESS_OWNER, 'owner-1');
      const t = await prisma.treatment.create({
        data: {
          name: 't',
          purpose: 'p',
          legalBasis: 'consent',
          personCategories: [],
          recipientTypes: [],
          securityMeasures: [],
          sensitiveCategories: [],
          subPurposes: [],
          retentionPeriod: '5y',
          createdBy: owner.id,
        },
      });
      const doc = {
        id: 'd1',
        linkedEntity: LinkedEntity.TREATMENT,
        linkedEntityId: t.id,
      } as Document;

      await expect(
        assertCanReadDocument(makeUser(Role.ADMIN, 'admin-1'), doc, prisma),
      ).resolves.toBeUndefined();
    });

    it('rejects PROCESS_OWNER who does not own the treatment with NotFoundException', async () => {
      const otherOwner = await seedUserRow(Role.PROCESS_OWNER, 'owner-other');
      await seedUserRow(Role.PROCESS_OWNER, 'owner-self');
      const t = await prisma.treatment.create({
        data: {
          name: 't',
          purpose: 'p',
          legalBasis: 'consent',
          personCategories: [],
          recipientTypes: [],
          securityMeasures: [],
          sensitiveCategories: [],
          subPurposes: [],
          retentionPeriod: '5y',
          createdBy: otherOwner.id,
        },
      });
      const doc = {
        id: 'd1',
        linkedEntity: LinkedEntity.TREATMENT,
        linkedEntityId: t.id,
      } as Document;

      await expect(
        assertCanReadDocument(makeUser(Role.PROCESS_OWNER, 'owner-self'), doc, prisma),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allows PROCESS_OWNER who owns the treatment (createdBy)', async () => {
      const owner = await seedUserRow(Role.PROCESS_OWNER, 'owner-self');
      const t = await prisma.treatment.create({
        data: {
          name: 't',
          purpose: 'p',
          legalBasis: 'consent',
          personCategories: [],
          recipientTypes: [],
          securityMeasures: [],
          sensitiveCategories: [],
          subPurposes: [],
          retentionPeriod: '5y',
          createdBy: owner.id,
        },
      });
      const doc = {
        id: 'd1',
        linkedEntity: LinkedEntity.TREATMENT,
        linkedEntityId: t.id,
      } as Document;

      await expect(
        assertCanReadDocument(makeUser(Role.PROCESS_OWNER, owner.id), doc, prisma),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertCanReadDocument - VIOLATION', () => {
    it('allows PROCESS_OWNER who created the violation', async () => {
      const u = await seedUserRow(Role.PROCESS_OWNER, 'owner-self');
      const v = await prisma.violation.create({
        data: { title: 'v', severity: 'LOW', awarenessAt: new Date(), createdBy: u.id },
      });
      const doc = {
        id: 'd',
        linkedEntity: LinkedEntity.VIOLATION,
        linkedEntityId: v.id,
      } as Document;
      await expect(
        assertCanReadDocument(makeUser(Role.PROCESS_OWNER, u.id), doc, prisma),
      ).resolves.toBeUndefined();
    });

    it('allows PROCESS_OWNER via ViolationTreatment join to an owned treatment', async () => {
      const owner = await seedUserRow(Role.PROCESS_OWNER, 'owner-self');
      const otherOwner = await seedUserRow(Role.PROCESS_OWNER, 'owner-other');
      const v = await prisma.violation.create({
        data: { title: 'v', severity: 'LOW', awarenessAt: new Date(), createdBy: otherOwner.id },
      });
      const t = await prisma.treatment.create({
        data: {
          name: 't',
          purpose: 'p',
          legalBasis: 'consent',
          personCategories: [],
          recipientTypes: [],
          securityMeasures: [],
          sensitiveCategories: [],
          subPurposes: [],
          retentionPeriod: '5y',
          createdBy: owner.id,
        },
      });
      await prisma.violationTreatment.create({ data: { violationId: v.id, treatmentId: t.id } });
      const doc = {
        id: 'd',
        linkedEntity: LinkedEntity.VIOLATION,
        linkedEntityId: v.id,
      } as Document;
      await expect(
        assertCanReadDocument(makeUser(Role.PROCESS_OWNER, owner.id), doc, prisma),
      ).resolves.toBeUndefined();
    });

    it('rejects PROCESS_OWNER with no ownership and no linked treatment', async () => {
      const otherOwner = await seedUserRow(Role.PROCESS_OWNER, 'owner-other');
      await seedUserRow(Role.PROCESS_OWNER, 'owner-self');
      const v = await prisma.violation.create({
        data: { title: 'v', severity: 'LOW', awarenessAt: new Date(), createdBy: otherOwner.id },
      });
      const doc = {
        id: 'd',
        linkedEntity: LinkedEntity.VIOLATION,
        linkedEntityId: v.id,
      } as Document;
      await expect(
        assertCanReadDocument(makeUser(Role.PROCESS_OWNER, 'owner-self'), doc, prisma),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assertCanReadDocument - CHECKLIST_ITEM', () => {
    it('allows any DOCUMENT_READ_ROLES regardless of ownership', async () => {
      await seedUserRow(Role.PROCESS_OWNER, 'owner-self');
      const doc = {
        id: 'd',
        linkedEntity: LinkedEntity.CHECKLIST_ITEM,
        linkedEntityId: 'static-item-123',
      } as Document;
      await expect(
        assertCanReadDocument(makeUser(Role.PROCESS_OWNER, 'owner-self'), doc, prisma),
      ).resolves.toBeUndefined();
    });
  });

  describe('role gate', () => {
    it('assertCanReadDocument throws ForbiddenException for an undefined user', async () => {
      const doc = {
        id: 'd',
        linkedEntity: LinkedEntity.TREATMENT,
        linkedEntityId: '00000000-0000-0000-0000-000000000000',
      } as Document;
      await expect(assertCanReadDocument(undefined, doc, prisma)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('assertCanReadFollowUpAttachment throws ForbiddenException for an undefined user', async () => {
      const a = {
        entityType: 'VIOLATION',
        entityId: '00000000-0000-0000-0000-000000000000',
        storageKey: 'k',
      } as FollowUpAttachment;
      await expect(assertCanReadFollowUpAttachment(undefined, a, prisma)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('assertCanReadFollowUpAttachment', () => {
    it('allows PROCESS_OWNER for VIOLATION attachment when violation is owned', async () => {
      const u = await seedUserRow(Role.PROCESS_OWNER, 'owner-self');
      const v = await prisma.violation.create({
        data: { title: 'v', severity: 'LOW', awarenessAt: new Date(), createdBy: u.id },
      });
      const a = {
        entityType: EntityType.VIOLATION,
        entityId: v.id,
        storageKey: 'k',
      } as unknown as FollowUpAttachment;
      await expect(
        assertCanReadFollowUpAttachment(makeUser(Role.PROCESS_OWNER, u.id), a, prisma),
      ).resolves.toBeUndefined();
    });

    it('rejects PROCESS_OWNER for DSR attachment when no DsrTreatmentProcessingLog joins an owned treatment', async () => {
      await seedUserRow(Role.PROCESS_OWNER, 'owner-self');
      const dsr = await prisma.dataSubjectRequest.create({
        data: {
          type: 'ACCESS',
          requesterName: 'X',
          requesterEmail: 'x@x.test',
          deadline: new Date(Date.now() + 1e9),
        },
      });
      const a = {
        entityType: EntityType.DSR,
        entityId: dsr.id,
        storageKey: 'k',
      } as unknown as FollowUpAttachment;
      await expect(
        assertCanReadFollowUpAttachment(makeUser(Role.PROCESS_OWNER, 'owner-self'), a, prisma),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allows PROCESS_OWNER for DSR attachment via DsrTreatmentProcessingLog join', async () => {
      const owner = await seedUserRow(Role.PROCESS_OWNER, 'owner-self');
      const dsr = await prisma.dataSubjectRequest.create({
        data: {
          type: 'ACCESS',
          requesterName: 'X',
          requesterEmail: 'x@x.test',
          deadline: new Date(Date.now() + 1e9),
        },
      });
      const t = await prisma.treatment.create({
        data: {
          name: 't',
          purpose: 'p',
          legalBasis: 'consent',
          personCategories: [],
          recipientTypes: [],
          securityMeasures: [],
          sensitiveCategories: [],
          subPurposes: [],
          retentionPeriod: '5y',
          createdBy: owner.id,
        },
      });
      await prisma.dsrTreatmentProcessingLog.create({
        data: { dsrId: dsr.id, treatmentId: t.id },
      });
      const a = {
        entityType: EntityType.DSR,
        entityId: dsr.id,
        storageKey: 'k',
      } as unknown as FollowUpAttachment;
      await expect(
        assertCanReadFollowUpAttachment(makeUser(Role.PROCESS_OWNER, owner.id), a, prisma),
      ).resolves.toBeUndefined();
    });
  });
});
