import { TreatmentStatus } from '@article30/shared';
import type { TreatmentDto } from '@article30/shared';

/**
 * Test fixture builder for TreatmentDto.
 *
 * Returns a minimal-but-valid TreatmentDto by default; overrides patch onto it.
 * Some required fields are typed loosely with `as unknown as TreatmentDto` because
 * the real DTO has many enum-typed fields whose test-friendly defaults vary by spec.
 */
export function makeTreatment(overrides: Partial<TreatmentDto> = {}): TreatmentDto {
  return {
    id: 't1',
    refNumber: 1,
    name: 'Test Treatment',
    purpose: null,
    subPurposes: [],
    legalBasis: null,
    personCategories: [],
    dataCategories: [],
    sensitiveCategories: [],
    hasSensitiveData: false,
    recipientTypes: [],
    transfers: [],
    retentionPeriod: null,
    securityMeasures: [],
    status: TreatmentStatus.DRAFT,
    indicators: undefined,
    createdBy: 'u',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  } as unknown as TreatmentDto;
}
