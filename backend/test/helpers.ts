import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaModule } from '../src/prisma/prisma.module';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR — test-only default

/* eslint-disable @typescript-eslint/no-explicit-any -- test mock requires flexible shapes */
export function createMockContext(overrides: {
  user?: Record<string, unknown>;
  session?: Record<string, unknown>;
  method?: string;
  headers?: Record<string, string>;
  isPublic?: boolean;
  roles?: string[];
}): {
  context: ExecutionContext;
  request: Record<string, any>; // NOSONAR — test mock needs flexible property access
  response: Record<string, any>; // NOSONAR — test mock needs flexible property access
  reflector: Reflector;
} {
  const request = {
    user: overrides.user ?? undefined,
    session: overrides.session ?? {},
    method: overrides.method ?? 'GET',
    headers: overrides.headers ?? {},
  };

  const response = {
    cookie: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };

  const handler = () => {};
  const classRef = class {
    readonly _stub = true;
  };

  const reflector = new Reflector();

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => handler,
    getClass: () => classRef,
  } as unknown as ExecutionContext;

  if (overrides.isPublic) {
    Reflect.defineMetadata('isPublic', true, handler);
  }
  if (overrides.roles) {
    Reflect.defineMetadata('roles', overrides.roles, handler);
  }

  return { context, request, response, reflector };
}

export async function createTestModule(): Promise<TestingModule> {
  process.env.DATABASE_URL = TEST_DB_URL;
  return Test.createTestingModule({
    imports: [PrismaModule],
  }).compile();
}

export async function cleanupDatabase(prisma: PrismaService) {
  await prisma.$transaction([
    prisma.notificationLog.deleteMany(),
    prisma.regulatoryUpdate.deleteMany(),
    prisma.rssFeed.deleteMany(),
    prisma.vendorAssessment.deleteMany(),
    prisma.vendorTreatment.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.requesterCommunication.deleteMany(),
    prisma.dsrTreatmentProcessingLog.deleteMany(),
    prisma.dsrPauseInterval.deleteMany(),
    prisma.dataSubjectRequest.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.checklistResponse.deleteMany(),
    prisma.complianceSnapshot.deleteMany(),
    prisma.remediationActionItem.deleteMany(),
    prisma.regulatorInteraction.deleteMany(),
    prisma.personsNotification.deleteMany(),
    prisma.breachNotificationFiling.deleteMany(),
    prisma.breachRiskAssessment.deleteMany(),
    prisma.violationTreatment.deleteMany(),
    prisma.violation.deleteMany(),
    prisma.screening.deleteMany(),
    prisma.treatment.deleteMany(),
    prisma.followUpContentRevision.deleteMany(),
    prisma.followUpDecision.deleteMany(),
    prisma.followUpAttachment.deleteMany(),
    prisma.followUpComment.deleteMany(),
    prisma.followUpTimeline.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.document.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
