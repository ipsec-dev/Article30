import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceService } from '../../src/modules/compliance/compliance.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const TURNOVER_1B = 1_000_000_000;
const TURNOVER_100M = 100_000_000;
const FINE_40M = 40_000_000;
const FINE_20M = 20_000_000;

describe('ComplianceService – computeFineExposure()', () => {
  let module: TestingModule;
  let service: ComplianceService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [ComplianceService],
    }).compile();

    service = module.get(ComplianceService);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await module.close();
  });

  it('returns null values when annualTurnover is not set', async () => {
    const result = await service.computeFineExposure();

    expect(result.annualTurnover).toBeNull();
    expect(result.maxFine).toBeNull();
    expect(result.estimatedExposure).toBeNull();
    expect(result.complianceScore).toBeDefined();
  });

  it('computes maxFine as 4% when greater than 20M (1B turnover → 40M)', async () => {
    await prisma.organization.create({
      data: { slug: `test-org-${Date.now()}`, annualTurnover: BigInt(TURNOVER_1B) },
    });

    const result = await service.computeFineExposure();

    expect(result.annualTurnover).toBe(TURNOVER_1B);
    expect(result.maxFine).toBe(FINE_40M); // 4% of 1B = 40M > 20M
  });

  it('uses 20M floor when 4% is lower (100M turnover → 4M < 20M → 20M)', async () => {
    await prisma.organization.create({
      data: { slug: `test-org-${Date.now()}`, annualTurnover: BigInt(TURNOVER_100M) },
    });

    const result = await service.computeFineExposure();

    expect(result.annualTurnover).toBe(TURNOVER_100M);
    expect(result.maxFine).toBe(FINE_20M); // 4% of 100M = 4M < 20M → floor at 20M
  });

  it('scales estimatedExposure by compliance gap', async () => {
    await prisma.organization.create({
      data: { slug: `test-org-${Date.now()}`, annualTurnover: BigInt(TURNOVER_1B) },
    });

    const result = await service.computeFineExposure();

    // maxFine = 40M, score = 0 (no data) → estimatedExposure = 40M * (1 - 0/100) = 40M
    expect(result.maxFine).toBe(FINE_40M);
    expect(result.complianceScore).toBe(0);
    expect(result.estimatedExposure).toBe(FINE_40M);
  });
});
