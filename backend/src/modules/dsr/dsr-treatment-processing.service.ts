import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  DsrTreatmentProcessingLog,
  TreatmentProcessingActionTaken,
  VendorPropagationStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityValidator } from '../follow-up/entity-validator';

type TxClient = Prisma.TransactionClient;

interface UpsertProcessingInput {
  dsrId: string;
  treatmentId: string;
  searchedAt?: Date;
  findingsSummary?: string;
  actionTaken: TreatmentProcessingActionTaken;
  actionTakenAt?: Date;
  performedBy?: string;
  vendorPropagationStatus: VendorPropagationStatus;
}

@Injectable()
export class DsrTreatmentProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: EntityValidator,
  ) {}

  async upsert(input: UpsertProcessingInput, tx?: TxClient): Promise<DsrTreatmentProcessingLog> {
    await this.validator.validate('DSR', input.dsrId);

    const client = tx ?? this.prisma;

    const updateData: Prisma.DsrTreatmentProcessingLogUpdateInput = {
      actionTaken: input.actionTaken,
      vendorPropagationStatus: input.vendorPropagationStatus,
      ...(input.searchedAt !== undefined && { searchedAt: input.searchedAt }),
      ...(input.findingsSummary !== undefined && { findingsSummary: input.findingsSummary }),
      ...(input.actionTakenAt !== undefined && { actionTakenAt: input.actionTakenAt }),
      ...(input.performedBy !== undefined && { performedBy: input.performedBy }),
    };

    return client.dsrTreatmentProcessingLog.upsert({
      where: { dsrId_treatmentId: { dsrId: input.dsrId, treatmentId: input.treatmentId } },
      create: {
        dsrId: input.dsrId,
        treatmentId: input.treatmentId,
        actionTaken: input.actionTaken,
        vendorPropagationStatus: input.vendorPropagationStatus,
        ...(input.searchedAt !== undefined && { searchedAt: input.searchedAt }),
        ...(input.findingsSummary !== undefined && { findingsSummary: input.findingsSummary }),
        ...(input.actionTakenAt !== undefined && { actionTakenAt: input.actionTakenAt }),
        ...(input.performedBy !== undefined && { performedBy: input.performedBy }),
      },
      update: updateData,
    });
  }

  async list(dsrId: string): Promise<DsrTreatmentProcessingLog[]> {
    await this.validator.validate('DSR', dsrId);

    return this.prisma.dsrTreatmentProcessingLog.findMany({
      where: { dsrId },
      orderBy: [{ treatmentId: 'asc' }],
    });
  }

  async link(
    dsrId: string,
    treatmentId: string,
    tx?: TxClient,
  ): Promise<DsrTreatmentProcessingLog> {
    await this.validator.validate('DSR', dsrId);

    const client = tx ?? this.prisma;

    return client.dsrTreatmentProcessingLog.upsert({
      where: { dsrId_treatmentId: { dsrId, treatmentId } },
      create: {
        dsrId,
        treatmentId,
        actionTaken: 'NONE',
        vendorPropagationStatus: 'NOT_REQUIRED',
      },
      update: {},
    });
  }

  async unlink(dsrId: string, treatmentId: string, tx?: TxClient): Promise<void> {
    await this.validator.validate('DSR', dsrId);

    const client = tx ?? this.prisma;

    try {
      await client.dsrTreatmentProcessingLog.delete({
        where: { dsrId_treatmentId: { dsrId, treatmentId } },
      });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2025'
      ) {
        // Row doesn't exist — idempotent no-op
        return;
      }
      throw err;
    }
  }
}
