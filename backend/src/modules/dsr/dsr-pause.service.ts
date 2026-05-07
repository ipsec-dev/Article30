import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, DsrPauseInterval, DsrPauseReason } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityValidator } from '../follow-up/entity-validator';

interface OpenPauseInput {
  dsrId: string;
  reason: DsrPauseReason;
  reasonDetails?: string;
  startedBy: string;
}

interface ClosePauseInput {
  dsrId: string;
  closedBy: string;
}

type TxClient = Prisma.TransactionClient;

@Injectable()
export class DsrPauseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: EntityValidator,
  ) {}

  async open(input: OpenPauseInput, tx?: TxClient): Promise<DsrPauseInterval> {
    await this.validator.validate('DSR', input.dsrId);

    const writer = async (client: TxClient) => {
      // Invariant: only one open interval (resumedAt IS NULL) per DSR at a time.
      const existing = await client.dsrPauseInterval.findFirst({
        where: { dsrId: input.dsrId, resumedAt: null },
        select: { id: true },
      });
      if (existing) {
        throw new BadRequestException('DSR already has an open pause');
      }

      const interval = await client.dsrPauseInterval.create({
        data: {
          dsrId: input.dsrId,
          reason: input.reason,
          reasonDetails: input.reasonDetails,
          startedBy: input.startedBy,
          pausedAt: new Date(),
        },
      });

      await client.followUpTimeline.create({
        data: {
          entityType: 'DSR',
          entityId: input.dsrId,
          kind: 'PAUSE_STARTED',
          payload: {
            pauseIntervalId: interval.id,
            reason: interval.reason,
            reasonDetails: interval.reasonDetails,
          } as Prisma.InputJsonValue,
          performedBy: input.startedBy,
        },
      });

      return interval;
    };

    if (tx) {
      return writer(tx);
    }
    return this.prisma.$transaction(writer);
  }

  async close(input: ClosePauseInput, tx?: TxClient): Promise<DsrPauseInterval> {
    await this.validator.validate('DSR', input.dsrId);

    const writer = async (client: TxClient) => {
      const open = await client.dsrPauseInterval.findFirst({
        where: { dsrId: input.dsrId, resumedAt: null },
        select: { id: true },
      });
      if (!open) {
        throw new NotFoundException('No open pause to close');
      }

      const resumedAt = new Date();
      const interval = await client.dsrPauseInterval.update({
        where: { id: open.id },
        data: { resumedAt },
      });

      await client.followUpTimeline.create({
        data: {
          entityType: 'DSR',
          entityId: input.dsrId,
          kind: 'PAUSE_ENDED',
          payload: {
            pauseIntervalId: interval.id,
            resumedAt: resumedAt.toISOString(),
          } as Prisma.InputJsonValue,
          performedBy: input.closedBy,
        },
      });

      return interval;
    };

    if (tx) {
      return writer(tx);
    }
    return this.prisma.$transaction(writer);
  }

  async list(dsrId: string): Promise<DsrPauseInterval[]> {
    await this.validator.validate('DSR', dsrId);
    return this.prisma.dsrPauseInterval.findMany({
      where: { dsrId },
      orderBy: [{ pausedAt: 'asc' }, { id: 'asc' }],
    });
  }
}
