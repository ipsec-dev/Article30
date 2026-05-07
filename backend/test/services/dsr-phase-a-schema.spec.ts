import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';

const NEW_TABLES = [
  'dsr_pause_intervals',
  'dsr_treatment_processing_logs',
  'requester_communications',
];

const NEW_DSR_COLUMNS = [
  'acknowledgedAt',
  'deadlineProfile',
  'extensionNotifiedAt',
  'rejectionReason',
  'rejectionDetails',
  'recourseInformedAt',
  'withdrawnAt',
  'withdrawnReason',
  'partialFulfilmentNotes',
  'feeApplied',
  'feeAmount',
];

describe('M3 Phase A schema', () => {
  let module: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  it.each(NEW_TABLES)('%s table exists', async tableName => {
    const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1`,
      tableName,
    );
    expect(rows).toHaveLength(1);
  });

  it('DsrStatus enum has exactly the 10 Phase A values', async () => {
    const values = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(
      `SELECT enumlabel FROM pg_enum
       JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
       WHERE pg_type.typname = 'DsrStatus'`,
    );
    const labels = values.map(v => v.enumlabel).sort();
    expect(labels).toEqual(
      [
        'RECEIVED',
        'ACKNOWLEDGED',
        'AWAITING_REQUESTER',
        'IDENTITY_VERIFIED',
        'IN_PROGRESS',
        'RESPONDED',
        'PARTIALLY_FULFILLED',
        'REJECTED',
        'WITHDRAWN',
        'CLOSED',
      ].sort(),
    );
  });

  it.each(NEW_DSR_COLUMNS)('data_subject_requests.%s column exists', async columnName => {
    const cols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'data_subject_requests' AND column_name = $1`,
      columnName,
    );
    expect(cols).toHaveLength(1);
  });

  it.each([
    ['DsrDeadlineProfile', ['STANDARD_30D', 'EXTENDED_90D', 'HEALTH_8D', 'HEALTH_OLD_60D']],
    [
      'DsrRejectionReason',
      [
        'MANIFESTLY_UNFOUNDED',
        'EXCESSIVE',
        'IDENTITY_UNVERIFIABLE',
        'REPEAT_NO_NEW_INFO',
        'LEGAL_BASIS_OVERRIDE',
      ],
    ],
    ['DsrPauseReason', ['IDENTITY_VERIFICATION', 'SCOPE_CLARIFICATION', 'OTHER']],
    [
      'TreatmentProcessingActionTaken',
      ['NONE', 'ACCESS_EXPORT', 'RECTIFIED', 'DELETED', 'RESTRICTED', 'NOT_APPLICABLE'],
    ],
    ['VendorPropagationStatus', ['NOT_REQUIRED', 'PENDING', 'PROPAGATED', 'REFUSED']],
    [
      'RequesterCommunicationKind',
      [
        'ACKNOWLEDGEMENT',
        'EXTENSION_NOTICE',
        'CLARIFICATION_REQUEST',
        'RESPONSE',
        'REJECTION',
        'WITHDRAWAL_CONFIRMATION',
      ],
    ],
    ['RequesterCommunicationChannel', ['EMAIL', 'POSTAL', 'IN_PERSON']],
  ])('%s enum has the prescribed values', async (enumName, expectedValues) => {
    const values = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(
      `SELECT enumlabel FROM pg_enum
       JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
       WHERE pg_type.typname = $1`,
      enumName,
    );
    expect(values.map(v => v.enumlabel).sort()).toEqual([...expectedValues].sort());
  });
});
