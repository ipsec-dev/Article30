import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { StorageService } from '../../src/modules/documents/storage.service';

const { sendSpy } = vi.hoisted(() => ({
  sendSpy: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function (this: { send: typeof sendSpy }) {
    this.send = sendSpy;
  }),
  PutObjectCommand: vi.fn(function (this: Record<string, unknown>, input: unknown) {
    this.__cmd = 'Put';
    this.input = input;
  }),
  GetObjectCommand: vi.fn(function (this: Record<string, unknown>, input: unknown) {
    this.__cmd = 'Get';
    this.input = input;
  }),
  DeleteObjectCommand: vi.fn(function (this: Record<string, unknown>, input: unknown) {
    this.__cmd = 'Delete';
    this.input = input;
  }),
  CreateBucketCommand: vi.fn(function (this: Record<string, unknown>, input: unknown) {
    this.__cmd = 'Create';
    this.input = input;
  }),
  HeadBucketCommand: vi.fn(function (this: Record<string, unknown>, input: unknown) {
    this.__cmd = 'Head';
    this.input = input;
  }),
}));

const ORIG_ENV = { ...process.env };

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    sendSpy.mockReset();
    process.env = { ...ORIG_ENV };
    service = new StorageService();
  });

  afterEach(() => {
    process.env = { ...ORIG_ENV };
  });

  describe('onModuleInit', () => {
    it('skips client creation and logs a warning when S3_ENDPOINT is unset', async () => {
      delete process.env.S3_ENDPOINT;
      await service.onModuleInit();
      await expect(service.upload('k', Buffer.from('x'), 'text/plain')).rejects.toThrow(
        /storage not configured/i,
      );
    });

    it('creates the client when S3_ENDPOINT is set and the bucket already exists (Head succeeds)', async () => {
      process.env.S3_ENDPOINT = 'http://localhost:9000';
      process.env.S3_BUCKET = 'article30-test';
      sendSpy.mockResolvedValueOnce({});
      await service.onModuleInit();
      expect(sendSpy).toHaveBeenCalledTimes(1);
      const cmd = sendSpy.mock.calls[0][0] as { __cmd: string };
      expect(cmd.__cmd).toBe('Head');
    });

    it('creates the bucket when Head fails but Create succeeds', async () => {
      process.env.S3_ENDPOINT = 'http://localhost:9000';
      sendSpy.mockRejectedValueOnce(new Error('NotFound'));
      sendSpy.mockResolvedValueOnce({});
      await service.onModuleInit();
      expect(sendSpy).toHaveBeenCalledTimes(2);
      const secondCmd = sendSpy.mock.calls[1][0] as { __cmd: string };
      expect(secondCmd.__cmd).toBe('Create');
    });

    it('swallows the error when Head AND Create both fail', async () => {
      process.env.S3_ENDPOINT = 'http://localhost:9000';
      sendSpy.mockRejectedValueOnce(new Error('NotFound'));
      sendSpy.mockRejectedValueOnce(new Error('PermissionDenied'));
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });

    it('swallows the error when Head fails with a non-Error throw', async () => {
      process.env.S3_ENDPOINT = 'http://localhost:9000';
      sendSpy.mockRejectedValueOnce(new Error('NotFound'));
      sendSpy.mockRejectedValueOnce('raw-string');
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('after successful init', () => {
    beforeEach(async () => {
      process.env.S3_ENDPOINT = 'http://localhost:9000';
      process.env.S3_BUCKET = 'article30-test';
      sendSpy.mockResolvedValueOnce({});
      await service.onModuleInit();
      sendSpy.mockReset();
    });

    it('upload sends PutObjectCommand with the right key/mime/body', async () => {
      sendSpy.mockResolvedValueOnce({});
      await service.upload('treatment/abc.pdf', Buffer.from('pdf-bytes'), 'application/pdf');
      expect(sendSpy).toHaveBeenCalledTimes(1);
      const cmd = sendSpy.mock.calls[0][0] as { __cmd: string; input: Record<string, unknown> };
      expect(cmd.__cmd).toBe('Put');
      expect(cmd.input.Key).toBe('treatment/abc.pdf');
      expect(cmd.input.ContentType).toBe('application/pdf');
    });

    it('delete sends DeleteObjectCommand', async () => {
      sendSpy.mockResolvedValueOnce({});
      await service.delete('treatment/abc.pdf');
      expect(sendSpy).toHaveBeenCalledTimes(1);
      const cmd = sendSpy.mock.calls[0][0] as { __cmd: string };
      expect(cmd.__cmd).toBe('Delete');
    });

    it('getObject returns body, headers, and 200 status when no Range is given', async () => {
      const bytes = Buffer.from('hello-bytes');
      sendSpy.mockResolvedValueOnce({
        Body: Readable.from(bytes),
        ContentType: 'application/pdf',
        ContentLength: bytes.length,
        ETag: '"abc"',
      });

      const result = await service.getObject('treatment/abc.pdf');

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const cmd = sendSpy.mock.calls[0][0] as { __cmd: string; input: Record<string, unknown> };
      expect(cmd.__cmd).toBe('Get');
      expect(cmd.input.Key).toBe('treatment/abc.pdf');
      expect(cmd.input.Range).toBeUndefined();
      expect(result.statusCode).toBe(200);
      expect(result.contentType).toBe('application/pdf');
      expect(result.contentLength).toBe(bytes.length);
      expect(result.contentRange).toBeUndefined();
      expect(result.etag).toBe('"abc"');
      expect(result.body).toBeInstanceOf(Readable);
    });

    it('getObject forwards the Range header and returns 206 + ContentRange', async () => {
      sendSpy.mockResolvedValueOnce({
        Body: Readable.from(Buffer.from('hello')),
        ContentType: 'application/pdf',
        ContentLength: 5,
        ContentRange: 'bytes 0-4/100',
      });

      const result = await service.getObject('treatment/abc.pdf', 'bytes=0-4');

      const cmd = sendSpy.mock.calls[0][0] as { input: Record<string, unknown> };
      expect(cmd.input.Range).toBe('bytes=0-4');
      expect(result.statusCode).toBe(206);
      expect(result.contentRange).toBe('bytes 0-4/100');
    });

    it('getObject maps NoSuchKey to NotFoundException', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      const err = new Error('not found');
      (err as Error & { name: string }).name = 'NoSuchKey';
      sendSpy.mockRejectedValueOnce(err);

      await expect(service.getObject('missing/key')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('getObject maps InvalidRange to HTTP 416', async () => {
      const { HttpException, HttpStatus } = await import('@nestjs/common');
      const err = new Error('bad range');
      (err as Error & { name: string }).name = 'InvalidRange';
      sendSpy.mockRejectedValueOnce(err);

      let caught: unknown;
      await service.getObject('k', 'bytes=999-999').catch(e => {
        caught = e;
      });
      expect(caught).toBeInstanceOf(HttpException);
      expect((caught as InstanceType<typeof HttpException>).getStatus()).toBe(
        HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      );
    });
  });

  describe('ensureClient guard', () => {
    it('throws a helpful error when called before S3_ENDPOINT is configured', async () => {
      delete process.env.S3_ENDPOINT;
      await service.onModuleInit();
      await expect(service.delete('k')).rejects.toThrow(/Set S3_ENDPOINT/);
      await expect(service.getObject('k')).rejects.toThrow(/Set S3_ENDPOINT/);
    });
  });
});
