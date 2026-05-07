import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { RegulatorInteractionDirection, RegulatorInteractionKind } from '@prisma/client';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class RecordInteractionDto {
  @IsEnum(RegulatorInteractionDirection)
  direction!: RegulatorInteractionDirection;

  @IsEnum(RegulatorInteractionKind)
  kind!: RegulatorInteractionKind;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  referenceNumber?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(10_000)
  @SanitizeHtml()
  summary!: string;
}
