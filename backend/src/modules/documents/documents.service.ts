import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { LinkedEntity } from '@article30/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PRISMA_SELECT } from '../../common/prisma/select-shapes';
import { StorageService } from './storage.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 255;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(file: Express.Multer.File, dto: UploadDocumentDto, userId: string) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('File too large. Maximum size is 10MB.');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: PDF, JPEG, PNG, DOCX, XLSX.`,
      );
    }

    const entity = dto.linkedEntity.toLowerCase();
    // UUID-only S3 key: the attacker-controlled original filename never
    // reaches the storage layer. The display name is stored separately in
    // Document.filename after sanitisation.
    const ext = path.extname(file.originalname) || '';
    const s3Key = `${entity}/${dto.linkedEntityId}/${randomUUID()}${ext}`;
    // eslint-disable-next-line no-control-regex
    const ctrlRe = /[\u0000-\u001F\u007F]/g;
    const sanitizedFilename = file.originalname
      .replaceAll(ctrlRe, '') // strip control characters
      .replaceAll(/[\\/]/g, '_') // strip path separators
      .slice(0, MAX_FILENAME_LENGTH);

    await this.storage.upload(s3Key, file.buffer, file.mimetype);

    const document = await this.prisma.document.create({
      data: {
        s3Key,
        linkedEntity: dto.linkedEntity,
        filename: sanitizedFilename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        linkedEntityId: dto.linkedEntityId,
        uploadedBy: userId,
      },
      include: {
        uploader: { select: PRISMA_SELECT.userRef },
      },
    });

    this.logger.log({
      event: 'document.uploaded',
      documentId: document.id,
      filename: document.filename,
      size: document.sizeBytes,
      userId,
    });

    return document;
  }

  async findByEntity(linkedEntity: string, linkedEntityId: string) {
    return this.prisma.document.findMany({
      where: { linkedEntity: linkedEntity as LinkedEntity, linkedEntityId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploader: { select: PRISMA_SELECT.userRef },
      },
    });
  }

  async getDownloadUrl(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const url = await this.storage.getPresignedUrl(document.s3Key);
    return { url, filename: document.filename };
  }

  async delete(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.storage.delete(document.s3Key);
    await this.prisma.document.delete({ where: { id } });

    this.logger.log({ event: 'document.deleted', documentId: id, filename: document.filename });
  }
}
