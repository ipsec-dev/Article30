import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { TreatmentsService } from '../../src/modules/treatments/treatments.service';

describe('Separation of Duties', () => {
  let service: TreatmentsService;
  let mockPrisma: {
    treatment: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    organization: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };

  const creatorId = 'user-creator-123';
  const otherUserId = 'user-other-456';

  const draftTreatment = {
    id: 'treatment-1',
    name: 'Test treatment',
    status: 'DRAFT',
    createdBy: creatorId,
    validatedBy: null,
    validatedAt: null,
    indicators: null,
  };

  const validatedTreatment = {
    ...draftTreatment,
    status: 'VALIDATED',
    validatedBy: otherUserId,
    validatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      treatment: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      organization: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const mockPdfService = {} as unknown as ConstructorParameters<typeof TreatmentsService>[1];
    service = new TreatmentsService(
      mockPrisma as unknown as ConstructorParameters<typeof TreatmentsService>[0],
      mockPdfService,
    );
  });

  it('should throw ForbiddenException when creator tries to validate their own treatment', async () => {
    mockPrisma.treatment.findUnique.mockResolvedValue(draftTreatment);

    await expect(service.validate(draftTreatment.id, creatorId)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.validate(draftTreatment.id, creatorId)).rejects.toThrow(
      'Cannot validate your own treatment (separation of duties)',
    );
  });

  it('should throw ForbiddenException when creator tries to invalidate their own treatment', async () => {
    mockPrisma.treatment.findUnique.mockResolvedValue(validatedTreatment);

    await expect(service.invalidate(validatedTreatment.id, creatorId)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.invalidate(validatedTreatment.id, creatorId)).rejects.toThrow(
      'Cannot validate your own treatment (separation of duties)',
    );
  });

  it('should allow a different user to validate', async () => {
    mockPrisma.treatment.findUnique.mockResolvedValue(draftTreatment);
    mockPrisma.treatment.update.mockResolvedValue({
      ...draftTreatment,
      status: 'VALIDATED',
      validatedBy: otherUserId,
      validatedAt: expect.any(Date),
    });

    const result = await service.validate(draftTreatment.id, otherUserId);
    expect(result.status).toBe('VALIDATED');
    expect(mockPrisma.treatment.update).toHaveBeenCalled();
  });

  it('should allow a different user to invalidate', async () => {
    mockPrisma.treatment.findUnique.mockResolvedValue(validatedTreatment);
    mockPrisma.treatment.update.mockResolvedValue({
      ...validatedTreatment,
      status: 'DRAFT',
      validatedBy: null,
      validatedAt: null,
    });

    const result = await service.invalidate(validatedTreatment.id, otherUserId);
    expect(result.status).toBe('DRAFT');
    expect(mockPrisma.treatment.update).toHaveBeenCalled();
  });
});
