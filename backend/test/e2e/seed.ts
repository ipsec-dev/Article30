import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { Role, Severity, DsrType, DpaStatus } from '@article30/shared';
import { Prisma } from '@prisma/client';
import type {
  User,
  Treatment,
  Violation,
  Vendor,
  VendorAssessment,
  DataSubjectRequest,
  Document,
  Screening,
  RssFeed,
  RegulatoryUpdate,
  LinkedEntity,
  PrismaClient,
} from '@prisma/client';

const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 10;

export interface SeedUserOpts {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  approved?: boolean;
}

export async function seedUser(
  prisma: PrismaClient,
  role: Role,
  opts: SeedUserOpts = {},
): Promise<{ user: User; password: string }> {
  const password = opts.password ?? 'Strongpass12';
  const user = await prisma.user.create({
    data: {
      firstName: opts.firstName ?? 'Test',
      lastName: opts.lastName ?? role,
      email: opts.email ?? `${role.toLowerCase()}-${randomUUID()}@example.test`,
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      role,
      approved: opts.approved ?? true,
    },
  });

  return { user, password };
}

export async function seedTreatment(
  prisma: PrismaClient,
  createdBy: string,
  opts: Partial<Prisma.TreatmentUncheckedCreateInput> = {},
): Promise<Treatment> {
  return prisma.treatment.create({
    data: {
      name: opts.name ?? `Treatment ${randomUUID().slice(0, 8)}`,
      purpose: opts.purpose ?? 'Default purpose',
      legalBasis: opts.legalBasis ?? 'consent',
      personCategories: opts.personCategories ?? ['employees'],
      recipientTypes: opts.recipientTypes ?? ['internal'],
      securityMeasures: opts.securityMeasures ?? ['encryption'],
      sensitiveCategories: opts.sensitiveCategories ?? [],
      subPurposes: opts.subPurposes ?? [],
      retentionPeriod: opts.retentionPeriod ?? '5 years',
      createdBy,
      ...opts,
    },
  });
}

export async function seedViolation(
  prisma: PrismaClient,
  createdBy: string,
  opts: Partial<Violation> = {},
): Promise<Violation> {
  return prisma.violation.create({
    data: {
      title: opts.title ?? `Violation ${randomUUID().slice(0, 8)}`,
      description: opts.description ?? 'Default description',
      severity: opts.severity ?? Severity.MEDIUM,
      awarenessAt: opts.awarenessAt ?? new Date(),
      createdBy,
      ...opts,
    },
  });
}

export async function seedVendor(
  prisma: PrismaClient,
  createdBy: string,
  opts: Partial<Vendor> = {},
): Promise<Vendor> {
  return prisma.vendor.create({
    data: {
      name: opts.name ?? `Vendor ${randomUUID().slice(0, 8)}`,
      dpaStatus: opts.dpaStatus ?? DpaStatus.MISSING,
      createdBy,
      ...opts,
    },
  });
}

export async function seedAssessment(
  prisma: PrismaClient,
  vendorId: string,
  createdBy: string,
  opts: Partial<Prisma.VendorAssessmentUncheckedCreateInput> = {},
): Promise<VendorAssessment> {
  return prisma.vendorAssessment.create({
    data: {
      vendorId,
      createdBy,
      answers: opts.answers ?? [],
      ...opts,
    },
  });
}

export async function seedDsr(
  prisma: PrismaClient,
  opts: Partial<DataSubjectRequest> = {},
): Promise<DataSubjectRequest> {
  return prisma.dataSubjectRequest.create({
    data: {
      type: opts.type ?? DsrType.ACCESS,
      requesterName: opts.requesterName ?? 'Jane Doe',
      requesterEmail: opts.requesterEmail ?? 'jane@example.test',
      deadline: opts.deadline ?? new Date(Date.now() + 30 * 24 * 3600 * 1000),
      ...opts,
    },
  });
}

export async function seedScreening(
  prisma: PrismaClient,
  createdBy: string,
  opts: Partial<Prisma.ScreeningUncheckedCreateInput> = {},
): Promise<Screening> {
  return prisma.screening.create({
    data: {
      title: opts.title ?? `Screening ${randomUUID().slice(0, 8)}`,
      responses: opts.responses ?? {},
      score: opts.score ?? 0,
      verdict: opts.verdict ?? 'GREEN',
      createdBy,
      ...opts,
    },
  });
}

export async function seedDocument(
  prisma: PrismaClient,
  linkedEntity: LinkedEntity,
  linkedEntityId: string,
  uploadedBy: string,
  opts: Partial<Document> = {},
): Promise<Document> {
  return prisma.document.create({
    data: {
      filename: opts.filename ?? 'doc.pdf',
      mimeType: opts.mimeType ?? 'application/pdf',
      sizeBytes: opts.sizeBytes ?? 1024,
      s3Key: opts.s3Key ?? `treatment/${linkedEntityId}/${randomUUID()}.pdf`,
      linkedEntity,
      linkedEntityId,
      uploadedBy,
      ...opts,
    },
  });
}

export async function seedRssFeed(
  prisma: PrismaClient,
  opts: Partial<RssFeed> = {},
): Promise<RssFeed> {
  return prisma.rssFeed.create({
    data: {
      label: opts.label ?? `Feed ${randomUUID().slice(0, 8)}`,
      url: opts.url ?? `https://example.test/feed-${randomUUID()}.xml`,
      enabled: opts.enabled ?? true,
      ...opts,
    },
  });
}

export async function seedRegulatoryUpdate(
  prisma: PrismaClient,
  feedId: string,
  opts: Partial<RegulatoryUpdate> = {},
): Promise<RegulatoryUpdate> {
  return prisma.regulatoryUpdate.create({
    data: {
      feedId,
      guid: opts.guid ?? `guid-${randomUUID()}`,
      title: opts.title ?? 'Test update',
      source: opts.source ?? 'cnil',
      publishedAt: opts.publishedAt ?? new Date(),
      ...opts,
    },
  });
}
