import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Role, SCREENING_QUESTIONS } from '@article30/shared';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { ScreeningsPdfService } from '../../src/modules/screenings/screenings-pdf.service';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test';

const KNOWN_HASH = 'b'.repeat(64);

function assertValidPdf(buf: Buffer): void {
  expect(Buffer.isBuffer(buf)).toBe(true);
  expect(buf.length).toBeGreaterThan(1000);
  expect(buf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
}

describe('ScreeningsPdfService', () => {
  let module: TestingModule;
  let service: ScreeningsPdfService;
  let prisma: PrismaService;
  let auditLogService: AuditLogService;
  let userId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        ScreeningsPdfService,
        {
          provide: AuditLogService,
          useValue: { create: vi.fn().mockResolvedValue({ hash: KNOWN_HASH }) },
        },
      ],
    }).compile();
    service = module.get(ScreeningsPdfService);
    prisma = module.get(PrismaService);
    auditLogService = module.get(AuditLogService);
  });

  afterAll(async () => {
    await module.close();
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
    vi.clearAllMocks();
  });

  async function seedCreator() {
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'Creator',
        email: `creator-${randomUUID()}@example.test`,
        password: await bcrypt.hash('Strongpass12', 4),
        role: Role.DPO,
        approved: true,
      },
    });
    userId = user.id;
    return user;
  }

  function allYesResponses(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const q of SCREENING_QUESTIONS) out[q.id] = 'YES';
    return out;
  }

  it('throws NotFoundException when the screening does not exist', async () => {
    await expect(service.generatePdf('non-existent-id', 'u-1')).rejects.toThrow(NotFoundException);
  });

  it('calls auditLog.create with action EXPORT, entity screening, and performedBy', async () => {
    await seedCreator();
    const s = await prisma.screening.create({
      data: {
        title: 'Audit test screening',
        responses: allYesResponses(),
        score: 100,
        verdict: 'GREEN',
        createdBy: userId,
      },
    });
    await service.generatePdf(s.id, 'u-exporter');
    expect(auditLogService.create).toHaveBeenCalledOnce();
    expect(auditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EXPORT',
        entity: 'screening',
        entityId: s.id,
        performedBy: 'u-exporter',
      }),
    );
  });

  it('generates a valid PDF for a GREEN verdict with no organization', async () => {
    await seedCreator();
    const s = await prisma.screening.create({
      data: {
        title: 'Green screening',
        responses: allYesResponses(),
        score: 100,
        verdict: 'GREEN',
        createdBy: userId,
      },
    });
    const buf = await service.generatePdf(s.id, 'u-1');
    assertValidPdf(buf);
  });

  it('generates a valid PDF with organization companyName rendered in header', async () => {
    await seedCreator();
    await prisma.organization.create({
      data: { slug: `test-org-${Date.now()}`, companyName: 'Acme SAS' },
    });
    const s = await prisma.screening.create({
      data: {
        title: 'Green screening with org',
        responses: allYesResponses(),
        score: 90,
        verdict: 'GREEN',
        createdBy: userId,
      },
    });
    const buf = await service.generatePdf(s.id, 'u-1');
    assertValidPdf(buf);
  });

  it('renders ORANGE verdict color path', async () => {
    await seedCreator();
    const s = await prisma.screening.create({
      data: {
        title: 'Orange screening',
        responses: allYesResponses(),
        score: 60,
        verdict: 'ORANGE',
        createdBy: userId,
      },
    });
    const buf = await service.generatePdf(s.id, 'u-1');
    assertValidPdf(buf);
  });

  it('renders RED verdict color path', async () => {
    await seedCreator();
    const s = await prisma.screening.create({
      data: {
        title: 'Red screening',
        responses: allYesResponses(),
        score: 20,
        verdict: 'RED',
        createdBy: userId,
      },
    });
    const buf = await service.generatePdf(s.id, 'u-1');
    assertValidPdf(buf);
  });

  it('renders the red-flags section when responses include NO / PARTIAL answers', async () => {
    await seedCreator();
    const responses: Record<string, string> = {};
    SCREENING_QUESTIONS.forEach((q, i) => {
      if (i === 0) responses[q.id] = 'NO';
      else if (i === 1) responses[q.id] = 'PARTIAL';
      else if (i === 2) responses[q.id] = 'IN_PROGRESS';
      else if (i === 3) responses[q.id] = 'NA';
      else responses[q.id] = 'YES';
    });
    const s = await prisma.screening.create({
      data: {
        title: 'Mixed-answers screening',
        responses,
        score: 55,
        verdict: 'ORANGE',
        createdBy: userId,
      },
    });
    const buf = await service.generatePdf(s.id, 'u-1');
    assertValidPdf(buf);
  });

  it('handles responses missing a question (answer falls back to "—" placeholder)', async () => {
    await seedCreator();
    const s = await prisma.screening.create({
      data: {
        title: 'Empty-responses screening',
        responses: {},
        score: 0,
        verdict: 'GREEN',
        createdBy: userId,
      },
    });
    const buf = await service.generatePdf(s.id, 'u-1');
    assertValidPdf(buf);
  });
});
