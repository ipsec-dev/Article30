import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DsrPauseReason } from '@prisma/client';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class OpenPauseDto {
  @IsEnum(DsrPauseReason)
  reason!: DsrPauseReason;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  @SanitizeHtml()
  reasonDetails?: string;
}
