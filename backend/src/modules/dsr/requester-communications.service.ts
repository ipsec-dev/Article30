import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  Prisma,
  RequesterCommunication,
  RequesterCommunicationKind,
  RequesterCommunicationChannel,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityValidator } from '../follow-up/entity-validator';

interface RecordCommunicationInput {
  dsrId: string;
  kind: RequesterCommunicationKind;
  sentAt: Date;
  channel: RequesterCommunicationChannel;
  contentRevisionId?: string;
  sentBy?: string;
}

type TxClient = Prisma.TransactionClient;

@Injectable()
export class RequesterCommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: EntityValidator,
  ) {}

  async record(input: RecordCommunicationInput, tx?: TxClient): Promise<RequesterCommunication> {
    await this.validator.validate('DSR', input.dsrId);

    const writer = async (client: TxClient) => {
      if (input.contentRevisionId) {
        const cr = await client.followUpContentRevision.findFirst({
          where: {
            id: input.contentRevisionId,
            entityType: 'DSR',
            entityId: input.dsrId,
          },
          select: { id: true },
        });
        if (!cr) {
          throw new BadRequestException('contentRevisionId does not belong to this DSR');
        }
      }

      const communication = await client.requesterCommunication.create({
        data: {
          dsrId: input.dsrId,
          kind: input.kind,
          sentAt: input.sentAt,
          channel: input.channel,
          ...(input.contentRevisionId !== undefined && {
            contentRevisionId: input.contentRevisionId,
          }),
          ...(input.sentBy !== undefined && { sentBy: input.sentBy }),
        },
      });

      await client.followUpTimeline.create({
        data: {
          entityType: 'DSR',
          entityId: input.dsrId,
          kind: 'NOTIFICATION_SENT',
          payload: {
            communicationId: communication.id,
            communicationKind: communication.kind,
            channel: communication.channel,
          } as Prisma.InputJsonValue,
          ...(input.sentBy !== undefined && { performedBy: input.sentBy }),
        },
      });

      return communication;
    };

    if (tx) {
      return writer(tx);
    }
    return this.prisma.$transaction(writer);
  }

  async list(dsrId: string): Promise<RequesterCommunication[]> {
    await this.validator.validate('DSR', dsrId);

    return this.prisma.requesterCommunication.findMany({
      where: { dsrId },
      orderBy: [{ sentAt: 'asc' }, { id: 'asc' }],
    });
  }
}
