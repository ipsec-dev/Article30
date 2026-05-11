import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { LinkedEntity } from '@article30/shared';
import { DocumentsService } from '../../src/modules/documents/documents.service';
import { StorageService } from '../../src/modules/documents/storage.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const BCRYPT_ROUNDS = 10;
const MAX_FILE_SIZE_MB = 11;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const PLACEHOLDER_ENTITY_ID = 'some-id';
const VIOLATION_ENTITY_ID = 'viol-1';

function createMockFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'test-document.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test content'),
    stream: null as unknown as Express.Multer.File['stream'],
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

describe('DocumentsService', () => {
  let module: TestingModule;
  let service: DocumentsService;
  let prisma: PrismaService;
  let storageService: StorageService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        DocumentsService,
        {
          provide: StorageService,
          useValue: {
            upload: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(DocumentsService);
    prisma = module.get(PrismaService);
    storageService = module.get(StorageService);
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
        email: overrides.email ?? 'docuser@example.com',
        password: hashedPassword,
        role: 'ADMIN',
        approved: true,
      },
    });
  }

  describe('upload()', () => {
    it('rejects files larger than 10MB', async () => {
      const user = await seedUser();
      const largeFile = createMockFile({ size: MAX_FILE_SIZE_BYTES });

      await expect(
        service.upload(
          largeFile,
          { linkedEntity: LinkedEntity.TREATMENT, linkedEntityId: PLACEHOLDER_ENTITY_ID },
          user.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unsupported MIME types', async () => {
      const user = await seedUser();
      const badFile = createMockFile({ mimetype: 'application/zip' });

      await expect(
        service.upload(
          badFile,
          { linkedEntity: LinkedEntity.TREATMENT, linkedEntityId: PLACEHOLDER_ENTITY_ID },
          user.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates document record in DB on valid upload', async () => {
      const user = await seedUser();
      const file = createMockFile();

      const doc = await service.upload(
        file,
        { linkedEntity: LinkedEntity.TREATMENT, linkedEntityId: 'treat-123' },
        user.id,
      );

      expect(doc.filename).toBe('test-document.pdf');
      expect(doc.mimeType).toBe('application/pdf');
      expect(doc.sizeBytes).toBe(1024);
      expect(doc.linkedEntity).toBe('TREATMENT');
      expect(doc.linkedEntityId).toBe('treat-123');
      expect(doc.uploadedBy).toBe(user.id);
      expect(doc.uploader).toBeDefined();
      expect(`${doc.uploader.firstName} ${doc.uploader.lastName}`).toBe('Test User');
      expect(storageService.upload).toHaveBeenCalled();
    });

    it('rejects when no file is provided', async () => {
      const user = await seedUser();

      await expect(
        service.upload(
          undefined as unknown as Express.Multer.File,
          { linkedEntity: LinkedEntity.TREATMENT, linkedEntityId: PLACEHOLDER_ENTITY_ID },
          user.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByEntity()', () => {
    it('finds documents by entity type and id', async () => {
      const user = await seedUser();
      const file = createMockFile();

      await service.upload(
        file,
        { linkedEntity: LinkedEntity.VIOLATION, linkedEntityId: VIOLATION_ENTITY_ID },
        user.id,
      );
      await service.upload(
        createMockFile({ originalname: 'other.pdf' }),
        { linkedEntity: LinkedEntity.VIOLATION, linkedEntityId: VIOLATION_ENTITY_ID },
        user.id,
      );
      await service.upload(
        createMockFile({ originalname: 'different-entity.pdf' }),
        { linkedEntity: LinkedEntity.TREATMENT, linkedEntityId: 'treat-1' },
        user.id,
      );

      const docs = await service.findByEntity('VIOLATION', VIOLATION_ENTITY_ID);

      expect(docs.length).toBe(2);
      expect(docs[0].uploader).toBeDefined();
      expect(docs[0].linkedEntity).toBe('VIOLATION');
    });
  });

  describe('findById()', () => {
    it('returns the document', async () => {
      const user = await seedUser();
      const file = createMockFile();
      const created = await service.upload(
        file,
        { linkedEntity: LinkedEntity.TREATMENT, linkedEntityId: 'treat-1' },
        user.id,
      );
      const found = await service.findById(created.id);
      expect(found.id).toBe(created.id);
    });

    it('throws NotFoundException for a missing id', async () => {
      await expect(service.findById('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete()', () => {
    it('deletes document from DB and S3', async () => {
      const user = await seedUser();
      const file = createMockFile();

      const doc = await service.upload(
        file,
        { linkedEntity: LinkedEntity.TREATMENT, linkedEntityId: 'treat-del' },
        user.id,
      );

      await service.delete(doc.id);

      expect(storageService.delete).toHaveBeenCalled();

      const found = await prisma.document.findUnique({ where: { id: doc.id } });
      expect(found).toBeNull();
    });

    it('throws NotFoundException for unknown document', async () => {
      await expect(service.delete('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
