import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Severity } from '@article30/shared';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';
import { AttachmentsService } from '../../src/modules/follow-up/attachments.service';
import { TimelineService } from '../../src/modules/follow-up/timeline.service';
import { EntityValidator } from '../../src/modules/follow-up/entity-validator';
import { StorageService } from '../../src/modules/documents/storage.service';
import { sha256Hex } from '../../src/common/hash-chain';

function makeStorageStub(): StorageService {
  return {
    upload: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as StorageService;
}

describe('AttachmentsService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let svc: AttachmentsService;
  let storage: StorageService;
  let userId: string;
  let violationId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
    storage = makeStorageStub();
    const validator = new EntityValidator(prisma);
    const timeline = new TimelineService(prisma, validator);
    svc = new AttachmentsService(prisma, validator, timeline, storage);

    await prisma.organization.create({ data: { slug: `at-${Date.now()}` } });
    const user = await prisma.user.create({
      data: {
        firstName: 'at',
        lastName: '',
        email: `at-${Date.now()}@x`,
        password: 'h',
        role: 'DPO',
        approved: true,
      },
    });
    userId = user.id;
    const violation = await prisma.violation.create({
      data: {
        title: 'at-target',
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
    await prisma.followUpAttachment.deleteMany();
    await prisma.followUpTimeline.deleteMany();
    vi.clearAllMocks();
  });

  it('uploads an attachment with a SHA-256 hash and emits a Timeline ATTACHMENT_ADDED event', async () => {
    const buffer = Buffer.from('hello world');
    const a = await svc.upload({
      entityType: 'VIOLATION',
      entityId: violationId,
      filename: 'evidence.txt',
      mimeType: 'text/plain',
      buffer,
      category: 'EVIDENCE',
      uploadedBy: userId,
    });
    expect(a.sha256).toBe(sha256Hex(buffer));
    expect(a.previousSha256).toBeNull();
    expect(a.storageKey).toContain(violationId);
    expect(storage.upload as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();

    const events = await prisma.followUpTimeline.findMany({
      where: { entityType: 'VIOLATION', entityId: violationId, kind: 'ATTACHMENT_ADDED' },
    });
    expect(events).toHaveLength(1);
    expect(events[0].performedBy).toBe(userId);
  });

  it('chains subsequent uploads against the previous attachment hash', async () => {
    const a = await svc.upload({
      entityType: 'VIOLATION',
      entityId: violationId,
      filename: 'a.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('aaa'),
      category: 'EVIDENCE',
      uploadedBy: userId,
    });
    const b = await svc.upload({
      entityType: 'VIOLATION',
      entityId: violationId,
      filename: 'b.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('bbb'),
      category: 'EVIDENCE',
      uploadedBy: userId,
    });
    expect(b.previousSha256).toBe(a.sha256);
    expect(a.previousSha256).toBeNull();
  });

  it('soft-delete preserves the chain (deletedAt + tombstone, storageKey nulled, hash kept)', async () => {
    const a = await svc.upload({
      entityType: 'VIOLATION',
      entityId: violationId,
      filename: 'doomed.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('xxx'),
      category: 'EVIDENCE',
      uploadedBy: userId,
    });
    await svc.softDelete({
      attachmentId: a.id,
      deletedBy: userId,
      deletionReason: 'wrong file',
    });
    const after = await prisma.followUpAttachment.findUniqueOrThrow({ where: { id: a.id } });
    expect(after.deletedAt).not.toBeNull();
    expect(after.storageKey).toBeNull();
    expect(after.sha256).toBe(a.sha256);
    expect(after.deletionReason).toBe('wrong file');
    expect(after.deletedBy).toBe(userId);
    expect(storage.delete as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();
  });

  it('list returns attachments in chronological-asc order (chain order)', async () => {
    await svc.upload({
      entityType: 'VIOLATION',
      entityId: violationId,
      filename: 'a.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('1'),
      category: 'EVIDENCE',
      uploadedBy: userId,
    });
    await svc.upload({
      entityType: 'VIOLATION',
      entityId: violationId,
      filename: 'b.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('2'),
      category: 'EVIDENCE',
      uploadedBy: userId,
    });
    const list = await svc.list('VIOLATION', violationId);
    expect(list[0].filename).toBe('a.txt');
    expect(list[1].filename).toBe('b.txt');
  });
});
