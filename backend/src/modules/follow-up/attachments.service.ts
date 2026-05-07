import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AttachmentCategory, EntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { sha256Hex } from '../../common/hash-chain';
import { acquireXactLock } from '../../common/pg-locks';
import { StorageService } from '../documents/storage.service';
import { EntityValidator } from './entity-validator';
import { TimelineService } from './timeline.service';

export interface UploadAttachmentInput {
  entityType: EntityType;
  entityId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  category: AttachmentCategory;
  uploadedBy: string;
}

export interface SoftDeleteInput {
  attachmentId: string;
  deletedBy: string;
  deletionReason: string;
}

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityValidator: EntityValidator,
    private readonly timeline: TimelineService,
    private readonly storage: StorageService,
  ) {}

  async upload(input: UploadAttachmentInput) {
    await this.entityValidator.validate(input.entityType, input.entityId);

    const sha256 = sha256Hex(input.buffer);
    const storageKey = `follow-up/${input.entityType.toLowerCase()}/${input.entityId}/${randomUUID()}`;

    // Two-phase upload: storage first, then DB transaction. If the inner
    // transaction throws (lock contention, constraint violation, connection
    // drop), best-effort delete the orphan storage object before rethrowing
    // so we don't leak blobs. (Review #F.)
    let uploaded = false;
    try {
      await this.storage.upload(storageKey, input.buffer, input.mimeType);
      uploaded = true;

      // Read the chain tip and insert under a per-entity advisory lock so two
      // concurrent uploads cannot both observe the same tip and fork the chain.
      return await this.prisma.$transaction(async tx => {
        await acquireXactLock(tx, 'follow-up.attachment', input.entityType, input.entityId);

        const last = await tx.followUpAttachment.findFirst({
          where: {
            entityType: input.entityType,
            entityId: input.entityId,
          },
          orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
          select: { sha256: true },
        });
        const previousSha256 = last?.sha256 ?? null;

        const attachment = await tx.followUpAttachment.create({
          data: {
            entityType: input.entityType,
            entityId: input.entityId,
            filename: input.filename,
            mimeType: input.mimeType,
            sizeBytes: input.buffer.byteLength,
            storageKey,
            sha256,
            previousSha256,
            category: input.category,
            uploadedBy: input.uploadedBy,
          },
        });
        await tx.followUpTimeline.create({
          data: {
            entityType: input.entityType,
            entityId: input.entityId,
            kind: 'ATTACHMENT_ADDED',
            payload: {
              attachmentId: attachment.id,
              filename: attachment.filename,
              category: attachment.category,
            } as Prisma.InputJsonValue,
            performedBy: input.uploadedBy,
          },
        });
        return attachment;
      });
    } catch (err) {
      if (uploaded) {
        // Best-effort cleanup; never mask the original error.
        this.storage.delete(storageKey).catch(() => undefined);
      }
      throw err;
    }
  }

  async softDelete(input: SoftDeleteInput) {
    const target = await this.prisma.followUpAttachment.findUnique({
      where: { id: input.attachmentId },
    });
    if (!target) {
      throw new NotFoundException('Attachment not found');
    }
    if (target.storageKey) {
      await this.storage.delete(target.storageKey);
    }
    return this.prisma.followUpAttachment.update({
      where: { id: input.attachmentId },
      data: {
        deletedAt: new Date(),
        deletedBy: input.deletedBy,
        deletionReason: input.deletionReason,
        storageKey: null,
      },
    });
  }

  async list(entityType: EntityType, entityId: string) {
    await this.entityValidator.validate(entityType, entityId);
    return this.prisma.followUpAttachment.findMany({
      where: { entityType, entityId },
      orderBy: [{ uploadedAt: 'asc' }, { id: 'asc' }],
    });
  }
}
