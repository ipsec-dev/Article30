import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

  async getPresignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const PRESIGNED_URL_EXPIRY_SECONDS = 900;
    return getSignedUrl(this.ensureClient(), command, { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS });
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
