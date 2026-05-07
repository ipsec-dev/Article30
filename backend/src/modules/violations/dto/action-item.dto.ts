import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RemediationActionItemStatus } from '@prisma/client';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class CreateActionItemDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  @SanitizeHtml()
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  @SanitizeHtml()
  description?: string;

  @IsUUID()
  ownerId!: string;

  @IsDateString()
  deadline!: string;
}

export class UpdateActionItemDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  @SanitizeHtml()
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  @SanitizeHtml()
  description?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsEnum(RemediationActionItemStatus)
  status?: RemediationActionItemStatus;
}
