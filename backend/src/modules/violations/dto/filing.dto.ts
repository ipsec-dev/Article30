import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NotificationFilingChannel, NotificationFilingPhase } from '@prisma/client';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class FileCnilDto {
  @IsEnum(NotificationFilingPhase)
  phase!: NotificationFilingPhase;

  @IsDateString()
  filedAt!: string;

  @IsEnum(NotificationFilingChannel)
  channel!: NotificationFilingChannel;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10_000)
  @SanitizeHtml()
  delayJustification?: string;
}
