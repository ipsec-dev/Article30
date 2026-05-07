import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DpaStatus } from '@article30/shared';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_CONTACT_NAME_LENGTH = 255;
const MAX_CONTACT_EMAIL_LENGTH = 255;

export class CreateVendorDto {
  @ApiProperty()
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  @SanitizeHtml()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPTION_LENGTH)
  @SanitizeHtml()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CONTACT_NAME_LENGTH)
  @SanitizeHtml()
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CONTACT_EMAIL_LENGTH)
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @SanitizeHtml()
  country?: string;

  @ApiPropertyOptional({ enum: DpaStatus })
  @IsOptional()
  @IsEnum(DpaStatus)
  dpaStatus?: DpaStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dpaSigned?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dpaExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSubProcessor?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentVendorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  treatmentIds?: string[];
}
