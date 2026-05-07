import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const ENV_CANDIDATES = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

function loadEnvIfNeeded(): void {
  if (process.env.DATABASE_URL) {
    return;
  }

  for (const envPath of ENV_CANDIDATES) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      if (process.env.DATABASE_URL) {
        return;
      }
    }
  }
}

function buildAdapter(): PrismaPg {
  loadEnvIfNeeded();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to construct the Prisma adapter');
  }
  return new PrismaPg({ connectionString });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ adapter: buildAdapter() });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.debug({ event: 'prisma.connected' });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.debug({ event: 'prisma.disconnected' });
  }
}
