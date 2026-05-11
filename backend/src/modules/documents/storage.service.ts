import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;
  private bucket!: string;

  async onModuleInit() {
    const endpoint = process.env.S3_ENDPOINT;
    if (!endpoint) {
      this.logger.warn({ event: 'storage.disabled', reason: 's3_endpoint_unset' });
      return;
    }

    this.bucket = process.env.S3_BUCKET || 'article30-documents';
    this.client = new S3Client({
      endpoint,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
      forcePathStyle: true,
    });

    await this.ensureBucket();
  }

  private async ensureBucket() {
    if (!this.client) {
      return;
    }
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log({ event: 'storage.bucket.created', bucket: this.bucket });
      } catch (err: unknown) {
        this.logger.error({ event: 'storage.bucket.create.failed', bucket: this.bucket, err });
      }
    }
  }

  private ensureClient(): S3Client {
    if (!this.client) {
      throw new Error('Document storage not configured. Set S3_ENDPOINT environment variable.');
    }
    return this.client;
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.ensureClient().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
  }

  async getObject(
    key: string,
    range?: string,
  ): Promise<{
    body: Readable;
    contentType: string;
    contentLength: number;
    contentRange?: string;
    etag?: string;
    statusCode: 200 | 206;
  }> {
    let response: GetObjectCommandOutput;
    try {
      response = await this.ensureClient().send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: range }),
      );
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === 'NoSuchKey' || name === 'NotFound') {
        throw new NotFoundException('Object not found');
      }
      if (name === 'InvalidRange') {
        throw new HttpException(
          'Range Not Satisfiable',
          HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
        );
      }
      throw err;
    }
    if (!response.Body) {
      throw new Error(`S3 GetObject returned no body for key: ${key}`);
    }
    return {
      body: response.Body as Readable,
      contentType: response.ContentType ?? 'application/octet-stream',
      contentLength: response.ContentLength ?? 0,
      contentRange: response.ContentRange,
      etag: response.ETag ?? undefined,
      statusCode: response.ContentRange ? 206 : 200,
    };
  }

  async delete(key: string): Promise<void> {
    await this.ensureClient().send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
