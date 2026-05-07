import { IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { RequesterCommunicationKind, RequesterCommunicationChannel } from '@prisma/client';

export class RecordCommunicationDto {
  @IsEnum(RequesterCommunicationKind)
  kind!: RequesterCommunicationKind;

  @Type(() => Date)
  @IsDate()
  sentAt!: Date;

  @IsEnum(RequesterCommunicationChannel)
  channel!: RequesterCommunicationChannel;

  @IsOptional()
  @IsUUID()
  contentRevisionId?: string;
}
